import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
import {
  Transaction,
  TransactionType,
} from '../transactions/entities/transaction.entity';
import { EmailService } from 'src/providers/email/email.service';
import { AdminEmailEntity } from '../emails/entities/admin-email.entity';

@Injectable()
export class OrdersService {
  constructor(
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
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
        where: { id: item.productId },
      });
      if (!product) {
        throw new NotFoundException(
          `Product with ID ${item.productId} not found`,
        );
      }

      let variant: ProductVariant | null = null;
      if (item.variantId) {
        variant = await ProductVariant.findOne({
          where: { id: item.variantId },
        });
        if (!variant) {
          throw new NotFoundException(
            `Product variant with ID ${item.variantId} not found`,
          );
        }
      }

      const price = this.getRoleBasedPrice(product, variant, user);
      console.log('userPrice' + ' ' + price);
      const total =
        parseFloat(price.toString()) * parseFloat(item.quantity.toString());

      shippingCostValue =
        parseFloat(shippingCostValue.toString()) +
        parseFloat(product.shippingCost.toString());

      const orderItem = new OrderItem();
      orderItem.product = product;
      orderItem.variant = variant;
      orderItem.quantity = item.quantity;
      orderItem.price = price;
      orderItem.total = total;
      orderItems.push(orderItem);

      console.log('total' + ' ' + total);

      subtotal += total;
    }

    // Calculate shipping cost (you can implement your own logic)
    const shippingCost = shippingCostValue; // Default shipping cost

    console.log('subtotal' + ' ' + subtotal);
    console.log('shippingCost' + ' ' + shippingCost);
    console.log('total' + ' ' + (subtotal + shippingCost));

    order.items = orderItems;
    order.subtotal = subtotal;
    order.shippingCost = shippingCost;
    order.total =
      parseFloat(subtotal.toString()) + parseFloat(shippingCost.toString()); // Add shippingCost;
    order.status = OrderStatus.PAYMENT_PENDING;
    order.paymentStatus = PaymentStatus.PENDING;

    await order.save();

    if (createOrderDto.gateway === PaymentGateway.WALLET) {
      if (user.wallet.balance < order.total) {
        console.log(user.wallet.balance, order.total);
        throw new BadRequestException('Insufficient wallet balance');
      }

      user.wallet.balance -= parseFloat(order.total.toString());
      user.wallet.creditDue += parseFloat(order.total.toString());
      await user.wallet.save();

      order.paymentStatus = PaymentStatus.COMPLETED;
      order.status = OrderStatus.CONFIRMED;
      order.paymentIntentId = 'wallet';
      await order.save();

      const transaction = new Transaction();
      transaction.user = user;
      transaction.type = TransactionType.WITHDRAWAL;
      transaction.amount = order.total;
      transaction.description = `Order #${order.id}`;

      await transaction.save();

      const emails = await AdminEmailEntity.find();

      this.emailService.loadadminEmails(emails.map((email) => email.email));

      await this.emailService.sendOrderConfirmationEmail(
        order.user.email,
        order.user.name,
        order,
      );

      await this.emailService.sendNewOrderNotificationToAdmin(order);

      return {
        success: true,
        message: `Successfully processed payment for order #${order.id}`,
        transactionId: transaction.id,
      };
    }

    // Create Stripe payment intent
    const payment = await this.paymentGatewayService.processPayment(
      createOrderDto.gateway,
      order.total,
      createOrderDto.cardInfo,
      userId,
      { type: 'order', orderId: order.id },
    );

    if (payment.requiresAction) {
      return {
        success: true,
        paymentUrl: payment.paymentUrl,
        message: 'Please complete the payment using the provided URL',
      };
    }
    // For Authorize.NET, process payment and update wallet immediately
    if (payment.success) {
      order.paymentStatus = PaymentStatus.COMPLETED;
      order.paymentIntentId = payment.transactionId;
      order.status = OrderStatus.CONFIRMED;
      await order.save();
      return {
        success: true,
        message: `Successfully processed payment for order #${order.id}`,
        transactionId: payment.transactionId,
      };
    }

    throw new BadRequestException('Payment processing failed');
  }

  async confirmPayment(orderId: number, userId: string) {
    const order = await Order.findOne({
      where: { id: orderId, user: { id: userId } },
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
      relations: {
        items: {
          product: true,
          variant: true,
        },
      },
      withDeleted: true, // This enables including soft deleted records
      relationLoadStrategy: 'query',
      take,
      skip,
      order: { createdAt: 'DESC' },
    });
  }

  async findUserOrders(userId: string, pagination: Pagination) {
    const { take = 10, skip = 0 } = pagination;
    return await Order.find({
      where: { user: { id: userId } },
      relations: {
        items: {
          product: true,
          variant: true,
        },
      },
      withDeleted: true, // This enables including soft deleted records
      relationLoadStrategy: 'query',
      take,
      skip,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, userId: string) {
    const order = await Order.findOne({
      where: { id },
      relations: {
        items: {
          product: true,
          variant: true,
        },
      },
      withDeleted: true, // This enables including soft deleted records
      relationLoadStrategy: 'query',
      loadRelationIds: false,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Transform the items to ensure deleted products/variants are included
    // for (const item of order.items) {
    //   // Load product with deleted
    //   if (item.productId) {
    //     item.product = await Product.findOne({
    //       where: { id: item.productId },
    //       withDeleted: true,
    //     });
    //   }

    //   // Load variant with deleted
    //   if (item.variantId) {
    //     item.variant = await ProductVariant.findOne({
    //       where: { id: item.variantId },
    //       withDeleted: true,
    //     });
    //   }
    // }

    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto, adminId: string) {
    const order = await Order.findOne({
      where: { id },
      relations: {
        items: {
          product: true,
          variant: true,
        },
      },
      withDeleted: true, // This enables including soft deleted records
      relationLoadStrategy: 'query',
    });
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
    if (updateOrderDto.adminNotes) {
      order.adminNotes = updateOrderDto.adminNotes;
    }

    await order.save();
    const emails = await AdminEmailEntity.find();

    this.emailService.loadadminEmails(emails.map((email) => email.email));

    // Send notification to user
    if (order.status != OrderStatus.DELIVERED)
      await this.emailService.sendOrderStatusUpdateEmail(
        order.user.email,
        order.user.name,
        order.id.toString(),
        order.status,
      );

    if (order.status === OrderStatus.DELIVERED)
      await this.emailService.sendOrderDeliveredEmail(
        order.user.email,
        order.user.name,
        order.id.toString(),
      );

    return order;
  }
}
