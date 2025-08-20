import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderFilterDto } from './dto/order-filter.dto';
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
import { Transaction, TransactionType } from '../transactions/entities/transaction.entity';
import { EmailService } from 'src/providers/email/email.service';
import { AdminEmailEntity } from '../emails/entities/admin-email.entity';
import { CouponsService } from '../coupons/coupons.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as PDFDocument from 'pdfkit';
import { LessThan } from 'typeorm';
import * as XLSX from 'xlsx';

@Injectable()
export class OrdersService {
  constructor(
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    private readonly couponsService: CouponsService,
  ) {}

  async generateOrderPdf(orderId: number) {
    const order = await Order.findOne({
      where: { id: orderId },
      relations: {
        items: {
          product: true,
          variant: true,
        },
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Determine payment method and get Stripe invoice if applicable
    let paymentMethod = 'Unknown';
    let stripeInvoiceUrl = null;
    
    if (order.paymentIntentId === 'wallet') {
      paymentMethod = 'Wallet';
    } else if (order.paymentIntentId && order.paymentIntentId.startsWith('cs_')) {
      paymentMethod = 'Stripe';
      try {
        // Retrieve Stripe session and invoice details
        const session = await this.paymentGatewayService['stripe'].checkout.sessions.retrieve(order.paymentIntentId);
        console.log('Stripe session:', session);
        if (session.invoice) {
          const invoice = await this.paymentGatewayService['stripe'].invoices.retrieve(session.invoice as string);
          stripeInvoiceUrl = invoice.hosted_invoice_url;
        }
        console.log('Stripe invoice URL:', stripeInvoiceUrl);
      } catch (error) {
        console.error('Error retrieving Stripe invoice:', error);
      }
    }

    // Initialize PDF with proper page settings
    const doc = new PDFDocument({
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      size: 'A4',
      autoFirstPage: true,
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {});

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace: number) => {
      if (doc.y + requiredSpace > doc.page.height - 50) {
        doc.addPage();
        return true;
      }
      return false;
    };

    // Company Info
    doc.fontSize(10)
      .text('Tru-Scapes®', { align: 'right' })
      .text('https://shop.tru-scapes.com', { align: 'right', underline: true })
      .moveDown(0.5);

    // Header
    doc.fontSize(24)
      .text('Order Details', { align: 'center' })
      .moveDown(0.5)
      .lineWidth(1)
      .lineCap('butt')
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke()
      .moveDown();

    // Order Summary Section
    checkPageBreak(100);
    doc.fontSize(16).text('Order Summary', { underline: true });
    doc.fontSize(12).moveDown(0.5);

    const summaryStartY = doc.y;
    doc.text(`Order ID: #${order.id}`, 50, summaryStartY)
      .text(`Order Date: ${new Date(order.createdAt).toLocaleString()}`, 50, summaryStartY + 20)
      .text(`Status: ${order.status}`, 300, summaryStartY)
      .text(`Purchase Order: ${order.paymentOrder || 'N/A'}`, 300, summaryStartY + 20)
      .text(`Payment Method: ${paymentMethod}`, 50, summaryStartY + 40);

    // Add Stripe invoice link if available (moved to Payment Information section)
    // if (stripeInvoiceUrl) {
    //   doc.text('Stripe Invoice: ', 300, summaryStartY + 40)
    //     .text(stripeInvoiceUrl, 380, summaryStartY + 40, { 
    //       underline: true, 
    //       link: stripeInvoiceUrl,
    //       width: 165
    //     });
    // }

    doc.moveDown(3);

    // Customer Information Section
    checkPageBreak(100);
    doc.fontSize(16).text('Customer Information', { underline: true });
    doc.fontSize(12).moveDown(0.5);

    const customerStartY = doc.y;
    doc.rect(50, customerStartY, 495, 90).stroke();
    doc.text(`Name: ${order.user.name}`, 60, customerStartY + 10)
      .text(`Email: ${order.user.email}`, 60, customerStartY + 30)
      .text(`Phone: ${order.user.phone || 'N/A'}`, 60, customerStartY + 50);

    // Shipping Address
    if (order.shippingAddress) {
      const addr = order.shippingAddress;
      doc.text(`Shipping Address:`, 300, customerStartY + 10)
        .text(`${addr.street}`, 300, customerStartY + 30)
        .text(`${addr.city}, ${addr.state} ${addr.zipCode}`, 300, customerStartY + 50)
        .text(`${addr.country}`, 300, customerStartY + 70);
    }

    doc.y = customerStartY + 100;
    doc.moveDown(2);

    // Order Items Section
    checkPageBreak(150);
    doc.fontSize(16).text('Order Items', { underline: true });
    doc.fontSize(12).moveDown(0.5);

    const table = {
      startX: 50,
      width: 495,
      columnWidths: {
        product: 180,
        sku: 80,
        qty: 50,
        price: 80,
        total: 105,
      },
      rowHeight: 30,
    };

    let currentY = doc.y;

    // Table Header
    doc.rect(table.startX, currentY, table.width, table.rowHeight).fill('#f0f0f0').stroke();
    doc.fillColor('black').font('Helvetica-Bold').fontSize(11);
    
    let xPos = table.startX + 5;
    doc.text('Product', xPos, currentY + 8);
    xPos += table.columnWidths.product;
    doc.text('SKU', xPos, currentY + 8);
    xPos += table.columnWidths.sku;
    doc.text('Qty', xPos, currentY + 8, { align: 'center', width: table.columnWidths.qty });
    xPos += table.columnWidths.qty;
    doc.text('Price', xPos, currentY + 8, { align: 'right', width: table.columnWidths.price });
    xPos += table.columnWidths.price;
    doc.text('Total', xPos, currentY + 8, { align: 'right', width: table.columnWidths.total });

    currentY += table.rowHeight;
    doc.font('Helvetica').fontSize(10);

    // Table Rows
    order.items.forEach((item, index) => {
      // Check if we need a new page for this row
      const pageBreakOccurred = checkPageBreak(table.rowHeight + 10);
      
      if (pageBreakOccurred) {
        // We're on a new page, redraw the header
        currentY = doc.y;
        doc.rect(table.startX, currentY, table.width, table.rowHeight).fill('#f0f0f0').stroke();
        doc.fillColor('black').font('Helvetica-Bold').fontSize(11);
        
        let xPos = table.startX + 5;
        doc.text('Product', xPos, currentY + 8);
        xPos += table.columnWidths.product;
        doc.text('SKU', xPos, currentY + 8);
        xPos += table.columnWidths.sku;
        doc.text('Qty', xPos, currentY + 8, { align: 'center', width: table.columnWidths.qty });
        xPos += table.columnWidths.qty;
        doc.text('Price', xPos, currentY + 8, { align: 'right', width: table.columnWidths.price });
        xPos += table.columnWidths.price;
        doc.text('Total', xPos, currentY + 8, { align: 'right', width: table.columnWidths.total });
        
        currentY += table.rowHeight;
        doc.font('Helvetica').fontSize(10);
      }

      // Alternate row colors
      if (index % 2 === 1) {
        doc.rect(table.startX, currentY, table.width, table.rowHeight).fill('#fafafa').stroke();
        doc.fillColor('black');
      } else {
        doc.rect(table.startX, currentY, table.width, table.rowHeight).stroke();
      }

      const itemName = item.variant
        ? `${item.product.name} (${item.variant.name})`
        : item.product.name;

      const sku = item.variant?.sku || `P-${item.product.id}`;
      
      let xPos = table.startX + 5;
      doc.text(itemName, xPos, currentY + 8, { width: table.columnWidths.product - 10, ellipsis: true });
      xPos += table.columnWidths.product;
      doc.text(sku, xPos, currentY + 8, { width: table.columnWidths.sku - 5 });
      xPos += table.columnWidths.sku;
      doc.text(item.quantity.toString(), xPos, currentY + 8, { align: 'center', width: table.columnWidths.qty });
      xPos += table.columnWidths.qty;
      doc.text(`$${parseFloat(item.price.toString()).toFixed(2)}`, xPos, currentY + 8, { align: 'right', width: table.columnWidths.price - 5 });
      xPos += table.columnWidths.price;
      doc.text(`$${(parseFloat(item.price.toString()) * item.quantity).toFixed(2)}`, xPos, currentY + 8, { align: 'right', width: table.columnWidths.total - 5 });

      currentY += table.rowHeight;
    });

    doc.y = currentY + 20;

    // Totals Section
    checkPageBreak(120);
    const totalsStartX = 350;
    const totalsWidth = 195;
    const totalsStartY = doc.y;
    
    // Calculate height based on whether coupon is applied
    const hasCoupon = order.discountAmount && order.discountAmount > 0;
    const totalsHeight = hasCoupon ? 110 : 90;

    doc.rect(totalsStartX, totalsStartY, totalsWidth, totalsHeight).stroke();
    doc.fontSize(12)
      .text('Subtotal:', totalsStartX + 10, totalsStartY + 15)
      .text(`$${parseFloat(order.subtotal.toString()).toFixed(2)}`, totalsStartX + 10, totalsStartY + 15, { width: totalsWidth - 20, align: 'right' })
      .text('Shipping:', totalsStartX + 10, totalsStartY + 35)
      .text(`$${parseFloat(order.shippingCost.toString()).toFixed(2)}`, totalsStartX + 10, totalsStartY + 35, { width: totalsWidth - 20, align: 'right' });

    // Add coupon discount if applied
    let totalSectionY = totalsStartY + 55;
    if (hasCoupon) {
      doc.text('Coupon Discount:', totalsStartX + 10, totalsStartY + 55)
        .text(`-$${parseFloat(order.discountAmount.toString()).toFixed(2)}`, totalsStartX + 10, totalsStartY + 55, { width: totalsWidth - 20, align: 'right' });
      if (order.couponCode) {
        doc.fontSize(10)
          .text(`(${order.couponCode})`, totalsStartX + 10, totalsStartY + 70, { width: totalsWidth - 20, align: 'right' })
          .fontSize(12);
      }
      totalSectionY = totalsStartY + 75;
    }

    doc.rect(totalsStartX, totalSectionY, totalsWidth, 35).fill('#f0f0f0').stroke();
    doc.fillColor('black').fontSize(14).font('Helvetica-Bold')
      .text('Total:', totalsStartX + 10, totalSectionY + 10)
      .text(`$${parseFloat(order.total.toString()).toFixed(2)}`, totalsStartX + 10, totalSectionY + 10, { width: totalsWidth - 20, align: 'right' });

    // Payment Information Section
    doc.y = totalSectionY + 45;
    checkPageBreak(80);
    doc.fontSize(16).font('Helvetica-Bold').text('Payment Information', { underline: true });
    doc.fontSize(12).font('Helvetica').moveDown(0.5);
    
    doc.text(`Payment Method: ${paymentMethod}`);
    doc.text(`Payment Status: ${order.paymentStatus}`);
    
    if (order.paymentIntentId && order.paymentIntentId !== 'wallet') {
      doc.text(`Transaction ID: ${order.paymentIntentId}`);
    }
    
    if (stripeInvoiceUrl) {
      doc.moveDown(0.5);
      doc.text('Stripe Invoice: ', { continued: true })
        .fillColor('blue')
        .text(stripeInvoiceUrl, { underline: true, link: stripeInvoiceUrl })
        .fillColor('black');
    }

    // Notes Section (if any)
    if (order.notes || order.adminNotes) {
      doc.moveDown(2);
      checkPageBreak(60);
      doc.fontSize(16).font('Helvetica-Bold').text('Notes', { underline: true });
      doc.fontSize(12).font('Helvetica').moveDown(0.5);
      
      if (order.notes) {
        doc.text(`Customer Notes: ${order.notes}`, { width: 495, align: 'left' });
      }
      if (order.adminNotes) {
        doc.moveDown(0.5);
        doc.text(`Admin Notes: ${order.adminNotes}`, { width: 495, align: 'left' });
      }
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).text('Thank you for your business!', { align: 'center' });
    doc.text('For questions about this order, please contact support@tru-scapes.com', { align: 'center' });

    // Finalize PDF
    doc.end();

    // Return the PDF buffer when it's ready
    return new Promise<{ buffer: Buffer; filename: string }>((resolve) => {
      doc.on('end', () => {
        resolve({
          buffer: Buffer.concat(chunks),
          filename: `order-${order.id}.pdf`
        });
      });
    });
  }

  async exportOrdersToExcel(filter: OrderFilterDto) {
    try {
      const queryBuilder = Order.createQueryBuilder('order')
        .leftJoinAndSelect('order.user', 'user')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('items.product', 'product')
        .leftJoinAndSelect('items.variant', 'variant')
        .leftJoinAndSelect('order.appliedCoupon', 'appliedCoupon')
        .orderBy('order.createdAt', 'DESC');

      // Apply filters
      if (filter?.status) {
        queryBuilder.andWhere('order.status = :status', { status: filter.status });
      }
      if (filter?.minAmount) {
        queryBuilder.andWhere('order.total >= :minAmount', { minAmount: filter.minAmount });
      }
      if (filter?.maxAmount) {
        queryBuilder.andWhere('order.total <= :maxAmount', { maxAmount: filter.maxAmount });
      }
      if (filter?.startDate) {
        queryBuilder.andWhere('order.createdAt >= :startDate', { startDate: new Date(filter.startDate) });
      }
      if (filter?.endDate) {
        queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: new Date(filter.endDate) });
      }

      const orders = await queryBuilder.getMany();

      if (!orders || orders.length === 0) {
        throw new BadRequestException('No orders found matching the filter criteria');
      }

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet([]);

      // Add headers
      XLSX.utils.sheet_add_aoa(worksheet, [[
        'Order ID', 'Date', 'Status', 'Payment Status',
        'Customer Name', 'Customer Email',
        'Product Name', 'Variant', 'Quantity', 'Price', 'Item Total',
        'Subtotal', 'Shipping Cost', 'Coupon Code', 'Discount Amount', 'Total',
        'Shipping Address', 'Notes', 'Tracking Number'
      ]], { origin: 'A1' });

      // Prepare data rows
      const data = orders.flatMap(order => {
        if (!order?.items?.length) return [];

        return order.items.map(item => ({
          'Order ID': order?.id || 'N/A',
           'Date': order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A',
           'Status': order?.status || 'N/A',
           'Payment Status': order?.paymentStatus || 'N/A',
           'Customer Name': order?.user?.name || 'N/A',
           'Customer Email': order?.user?.email || 'N/A',
           'Product Name': item?.product?.name || 'N/A',
           'Variant': item?.variant?.name || 'N/A',
           'Quantity': item?.quantity || 0,
           'Price': item?.price || 0,
           'Item Total': item?.total || 0,
           'Subtotal': order?.subtotal || 0,
           'Shipping Cost': order?.shippingCost || 0,
           'Coupon Code': order?.couponCode || '',
           'Discount Amount': order?.discountAmount || 0,
           'Total': order?.total || 0,
           'Shipping Address': order?.shippingAddress ? `${order.shippingAddress.street || ''}, ${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''}, ${order.shippingAddress.country || ''} ${order.shippingAddress.zipCode || ''}`.trim() : 'N/A',
           'Notes': order?.notes || '',
           'Tracking Number': order?.trackingNumber || ''
        }));
      });

      if (!data || data.length === 0) {
        throw new BadRequestException('No valid order data available for export');
      }

      // Add data to worksheet
      XLSX.utils.sheet_add_json(worksheet, data, { origin: 'A2', skipHeader: true });

      // Auto-size columns
      const max_width = data.reduce((w, r) => Math.max(w, Object.values(r).join('').length), 10);
      const wscols = Array(Object.keys(data[0] || {}).length).fill({ wch: Math.min(max_width, 50) });
      worksheet['!cols'] = wscols;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return excelBuffer;
    } catch (error) {
      throw new BadRequestException('Failed to generate Excel file: ' + error.message);
    }
  }

  calculateShipping = (subtotal: number) => {
    if (subtotal >= 2500) {
      return 0; // Free shipping for orders $2500 and above
    }
    const shippingCost =  subtotal * 0.05; // 15% shipping for orders under $2500
    return Math.max(shippingCost, 10);
  };

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
    order.paymentOrder = createOrderDto.paymentOrder;

    // Calculate totals
    let subtotal = 0;
    const orderItems: OrderItem[] = [];

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

      let price = this.getRoleBasedPrice(product, variant, user);
      const casePricePerQuantity = price * 0.95;
      const caseSize = parseInt(product.caseSize.toString());

      if(caseSize) {
        if(parseInt(item.quantity.toString())%caseSize === 0) {
          price = casePricePerQuantity ;
        }
      }

      console.log('userPrice' + ' ' + price);
      const total =
        parseFloat(price.toString()) * parseFloat(item.quantity.toString());

      

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
    let shippingCost = this.calculateShipping(subtotal); // Default shipping cost

    if(createOrderDto.shippingAddress.city === 'Store Collection') {
      shippingCost = 0;
    }

    // Handle coupon application
    let discountAmount = 0;
    let appliedCoupon = null;
    let couponCode = null;
    
    if (createOrderDto.couponCode) {
      const couponValidation = await this.couponsService.validateAndApplyCoupon(
        {
          couponCode: createOrderDto.couponCode,
          orderAmount: subtotal + shippingCost,
        },
        userId,
      );

      if (!couponValidation.isValid) {
        throw new BadRequestException(couponValidation.message);
      }

      discountAmount = couponValidation.discountAmount || 0;
      appliedCoupon = couponValidation.coupon;
      couponCode = createOrderDto.couponCode;
    }

    console.log('subtotal' + ' ' + subtotal);
    console.log('shippingCost' + ' ' + shippingCost);
    console.log('discountAmount' + ' ' + discountAmount);
    console.log('total' + ' ' + (subtotal + shippingCost - discountAmount));

    order.items = orderItems;
    order.subtotal = subtotal;
    order.shippingCost = shippingCost;
    order.discountAmount = discountAmount;
    order.appliedCoupon = appliedCoupon;
    order.couponCode = couponCode;
    order.total =
      parseFloat(subtotal.toString()) + parseFloat(shippingCost.toString()) - parseFloat(discountAmount.toString());
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

      // Record coupon usage if coupon was applied
      if (appliedCoupon && discountAmount > 0) {
        await this.couponsService.recordCouponUsage(
          appliedCoupon.id,
          userId,
          order.id.toString(),
          discountAmount,
          subtotal + shippingCost,
        );
      }

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

      await this.emailService.sendNewOrderNotificationToAdmin(
        order,
      );

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

      // Record coupon usage if coupon was applied
      if (appliedCoupon && discountAmount > 0) {
        await this.couponsService.recordCouponUsage(
          appliedCoupon.id,
          userId,
          order.id.toString(),
          discountAmount,
          subtotal + shippingCost,
        );
      }

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

  async findAll(pagination: Pagination, filter: OrderFilterDto) {
    const { take = 10, skip = 0 } = pagination;
    const query = Order.createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.variant', 'variant')
      .leftJoinAndSelect('order.appliedCoupon', 'appliedCoupon');

    try {
      // Apply filters if they exist
      if (filter?.status) {
        query.andWhere('order.status = :status', { status: filter.status });
      }

      if (filter?.minAmount) {
        query.andWhere('order.total >= :minAmount', { minAmount: filter.minAmount });
      }

      if (filter?.maxAmount) {
        query.andWhere('order.total <= :maxAmount', { maxAmount: filter.maxAmount });
      }

      if (filter?.startDate) {
        query.andWhere('order.createdAt >= :startDate', { startDate: filter.startDate });
      }

      if (filter?.endDate) {
        query.andWhere('order.createdAt <= :endDate', { endDate: filter.endDate });
      }

      // Add pagination and ordering
      query
        .orderBy('order.createdAt', 'DESC')
        .skip(skip)
        .take(take);

      const [orders, total] = await query.getManyAndCount();

      return orders;
    } catch (error) {
      throw new BadRequestException('Failed to fetch orders: ' + error.message);
    }
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
        appliedCoupon: true,
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
        appliedCoupon: true,
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
        order,
        order.status
      );

    if (order.status === OrderStatus.DELIVERED)
      await this.emailService.sendOrderDeliveredEmail(
        order.user.email,
        order.user.name,
        order.id.toString(),
      );

    return order;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePaymentPendingOrders() {
    const orders = await Order.find({
      where: {
        status: OrderStatus.PAYMENT_PENDING,
        createdAt: LessThan(new Date(Date.now() - 1000 * 60 * 60 * 24)),
      },
    });

    for (const order of orders) {
      order.status = OrderStatus.FAILED;
      await order.save();
    }
  }
}
