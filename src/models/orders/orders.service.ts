import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { Pagination } from 'src/common/dtos/pagination.dto';
import { PaymentGatewayService } from '../wallet/services/payment-gateway.service';
import { PaymentGateway } from '../wallet/dto/repay-dues.dto';
import { NotificationService } from 'src/providers/notification/notification.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly notificationService: NotificationService,
  ) {}

  getRoleBasedPrice(product: Product, variant: ProductVariant, user: User) {
    switch (user.role) {
      case UserRole.DEALER:
        return variant.dealerPrice;
      case UserRole.DISTRIBUTOR:
        return variant.distributorPrice;
      case UserRole.CONTRACTOR:
        return variant.contractorPrice;
      default:
        return variant.price || product.basePrice;
    }
  }

  async create(createOrderDto: CreateOrderDto, userId: string) {
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create new order
    const order = new Order();
    order.user = user;
    order.shippingAddress = createOrderDto.shippingAddress;
    order.notes = createOrderDto.notes;

    // Calculate totals
    let subtotal = 0;
    const orderItems: OrderItem[] = [];
    let shippingCostValue = 0;

    // Process each order item
    for (const item of createOrderDto.items) {
      const product = await Product.findOne({ 
        where: { id: item.productId }
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${item.productId} not found`);
      }

      let variant: ProductVariant | null = null;
      if (item.variantId) {
        variant = await ProductVariant.findOne({ 
          where: { id: item.variantId }
        });
        if (!variant) {
          throw new NotFoundException(`Product variant with ID ${item.variantId} not found`);
        }
      }
      
      const price = this.getRoleBasedPrice(product, variant, user);
      const total = price * item.quantity;

      shippingCostValue = shippingCostValue + product.shippingCost;

      const orderItem = new OrderItem();
      orderItem.product = product;
      orderItem.variant = variant;
      orderItem.quantity = item.quantity;
      orderItem.price = price;
      orderItem.total = total;
      orderItems.push(orderItem);

      subtotal += total;
    }

    // Calculate shipping cost (you can implement your own logic)
    const shippingCost = shippingCostValue; // Default shipping cost

    order.items = orderItems;
    order.subtotal = subtotal;
    order.shippingCost = shippingCost;
    order.total = subtotal + shippingCost;
    order.status = OrderStatus.PAYMENT_PENDING;
    order.paymentStatus = PaymentStatus.PENDING;

    await order.save();

    // Create Stripe payment intent
    const paymentIntent = await this.paymentGatewayService.processPayment(
      PaymentGateway.STRIPE,
      order.total,
      null,
      userId,
    );

    order.paymentIntentId = paymentIntent.transactionId;
    await order.save();

    // Send notification
    await this.notificationService.sendNotificationToUser({
      notification: {
        title: 'Order Created',
        body: `Your order #${order.id} has been created. Please complete the payment.`,
      },
      user: { id: userId },
    });

    return {
      order,
      paymentUrl: paymentIntent.paymentUrl,
    };
  }

  async confirmPayment(orderId: number, userId: string) {
    const order = await Order.findOne({ 
      where: { id: orderId, user: { id: userId } }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment already completed');
    }

    // Verify payment with Stripe
    // This should be handled by a webhook in production
    order.paymentStatus = PaymentStatus.COMPLETED;
    order.status = OrderStatus.CONFIRMED;
    await order.save();

    // Send notification
    await this.notificationService.sendNotificationToUser({
      notification: {
        title: 'Payment Confirmed',
        body: `Payment for order #${order.id} has been confirmed.`,
      },
      user: { id: userId },
    });

    return order;
  }

  async findAll(pagination: Pagination) {
    const { take = 10, skip = 0 } = pagination;
    return await Order.find({
      take,
      skip,
      order: { createdAt: 'DESC' },
    });
  }

  async findUserOrders(userId: string, pagination: Pagination) {
    const { take = 10, skip = 0 } = pagination;
    return await Order.find({
      where: { user: { id: userId } },
      take,
      skip,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, userId: string) {
    const order = await Order.findOne({ 
      where: { id, user: { id: userId } }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto, adminId: string) {
    const order = await Order.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Update order
    if (updateOrderDto.status) {
      order.status = updateOrderDto.status;
    }
    if (updateOrderDto.trackingNumber) {
      order.trackingNumber = updateOrderDto.trackingNumber;
    }
    if (updateOrderDto.notes) {
      order.notes = updateOrderDto.notes;
    }

    await order.save();

    // Send notification to user
    await this.notificationService.sendNotificationToUser({
      notification: {
        title: 'Order Updated',
        body: `Your order #${order.id} status has been updated to ${order.status}`,
      },
      user: { id: order.user.id },
    });

    return order;
  }
}