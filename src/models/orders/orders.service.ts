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
import { PassThrough } from 'stream';
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
    const startTime = Date.now();
    let lastMark = startTime;
    const logStep = (event: string, extra: Record<string, any> = {}) => {
      const now = Date.now();
      const delta = now - lastMark;
      const total = now - startTime;
      lastMark = now;
      try {
        //console.log('[OrderPDF]', { orderId, event, deltaMs: delta, totalMs: total, ...extra });
      } catch {}
    };
    logStep('start');
    const order = await Order.getRepository()
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.variant', 'variant')
      .leftJoinAndSelect('order.appliedCoupon', 'appliedCoupon')
      .where('order.id = :id', { id: orderId })
      .select([
        // order core fields
        'order.id',
        'order.createdAt',
        'order.status',
        'order.subtotal',
        'order.shippingCost',
        'order.discountAmount',
        'order.couponCode',
        'order.total',
        'order.paymentIntentId',
        'order.paymentOrder',
        'order.notes',
        'order.adminNotes',
        'order.shippingAddress',
        // user minimal fields
        'user.id',
        'user.name',
        'user.email',
        // items minimal fields
        'items.id',
        'items.quantity',
        'items.price',
        'items.total',
        // product minimal fields
        'product.id',
        'product.name',
        // variant minimal fields
        'variant.id',
        'variant.name',
        'variant.sku',
        // coupon id if needed
        'appliedCoupon.id',
      ])
      .getOne();

    logStep('order-fetched');

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Determine payment method and get Stripe invoice if applicable
    let paymentMethod = 'Unknown';
    let stripeInvoiceUrl = null;
    
    if (order.paymentIntentId === 'wallet') {
      paymentMethod = 'Wallet';
    } else if (order.paymentIntentId && order.paymentIntentId.startsWith('cs_')) {
      paymentMethod = 'Credit Card';
      try {
        logStep('stripe-lookup-start');
        const stripeClient = this.paymentGatewayService['stripe'];
        const invoiceUrlPromise = (async () => {
          const session = await stripeClient.checkout.sessions.retrieve(order.paymentIntentId);
          if (session.invoice) {
            const invoice = await stripeClient.invoices.retrieve(session.invoice as string);
            return invoice.hosted_invoice_url || null;
          }
          return null;
        })();
        // Avoid long waits on Stripe by timing out quickly
        stripeInvoiceUrl = await Promise.race([
          invoiceUrlPromise,
          new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ]);
        logStep('stripe-lookup-done', { stripeInvoiceUrlPresent: !!stripeInvoiceUrl });
      } catch (error) {
        console.error('[OrderPDF]', { orderId, event: 'stripe-error', error });
      }
    }
    logStep('payment-details-ready', { paymentMethod });

    // Initialize PDF with modern settings (with defensive error handling)
    const stream = new PassThrough();
    const doc = new PDFDocument({
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      size: 'A4',
      autoFirstPage: true,
    });
    doc.on('error', (err) => {
      try {
        console.error('[OrderPDF]', { orderId, event: 'pdfkit-error', error: err });
        stream.destroy(err);
      } catch {}
    });
    stream.on('error', (err) => {
      try { console.error('[OrderPDF]', { orderId, event: 'stream-error', error: err }); } catch {}
    });
    doc.pipe(stream);
    logStep('pdf-init');

    // Helper function for text wrapping
    const wrapText = (text: string, maxWidth: number, fontSize: number = 10) => {
      doc.fontSize(fontSize);
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = doc.widthOfString(testLine);
        
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            lines.push(word);
          }
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    };

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace: number) => {
      if (doc.y + requiredSpace > doc.page.height - 60) {
        doc.addPage();
        return true;
      }
      return false;
    };

    // Modern Header with Company Branding
    const headerHeight = 80;
    doc.rect(40, 40, 515, headerHeight).fill('#2563eb').stroke();
    
    // Company name and logo area
    doc.fillColor('white')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('Tru-Scapes', 60, 65);
    
    doc.fontSize(12)
      .font('Helvetica')
      .text('Premium Landscaping Solutions', 60, 95);
    
    // Invoice title
    doc.fontSize(24)
      .font('Helvetica-Bold')
      .text('INVOICE', 450, 65, { align: 'right' });
    
    doc.fontSize(12)
      .font('Helvetica')
      .text(`#${order.id}`, 450, 95, { align: 'right' });

    doc.y = 140;
    doc.fillColor('black');
    logStep('header-rendered');

    // Order Information Cards
    const cardY = doc.y;
    const cardHeight = 100;
    const cardWidth = 240;
    const cardSpacing = 20;

    // Order Details Card
    doc.rect(40, cardY, cardWidth, cardHeight).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#1e293b')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Order Details', 55, cardY + 15);
    
    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#475569')
      .text('Order Date:', 55, cardY + 35)
      .fillColor('#1e293b')
      .text(new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }), 55, cardY + 50)
      .fillColor('#475569')
      .text('Status:', 55, cardY + 65)
      .fillColor('#059669')
      .font('Helvetica-Bold')
      .text(order.status.replace('_', ' ').toUpperCase(), 55, cardY + 80);

    // Customer Information Card
    doc.rect(40 + cardWidth + cardSpacing, cardY, cardWidth, cardHeight).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#1e293b')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Customer Information', 55 + cardWidth + cardSpacing, cardY + 15);
    
    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#475569')
      .text('Name:', 55 + cardWidth + cardSpacing, cardY + 35)
      .fillColor('#1e293b')
      .text(order.user.name, 55 + cardWidth + cardSpacing, cardY + 50)
      .fillColor('#475569')
      .text('Email:', 55 + cardWidth + cardSpacing, cardY + 65)
      .fillColor('#1e293b')
      .text(order.user.email, 55 + cardWidth + cardSpacing, cardY + 80, { width: cardWidth - 30, ellipsis: true });

    doc.y = cardY + cardHeight + 30;
    logStep('cards-rendered');

    // Shipping Address Section
    if (order.shippingAddress) {
      checkPageBreak(80);
      doc.fillColor('#1e293b')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Shipping Address', 40, doc.y);
      
      const addr = order.shippingAddress;
      const addressLines = [
        addr.street,
        `${addr.city}, ${addr.state} ${addr.zipCode}`,
        addr.country
      ].filter(line => line && line.trim());
      
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#475569');
      
      let addressY = doc.y + 20;
      addressLines.forEach(line => {
        doc.text(line, 40, addressY);
        addressY += 15;
      });
      
      doc.y = addressY + 10;
    }
    logStep('shipping-rendered');

    // Modern Items Table
    checkPageBreak(200);
    doc.fillColor('#1e293b')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Order Items', 40, doc.y);
    
    doc.y += 25;
    
    const tableStartY = doc.y;
    const tableWidth = 515;
    const rowHeight = 50;
    
    // Responsive column widths
    const columns = {
      product: { width: 250, x: 40 },
      qty: { width: 60, x: 290 },
      price: { width: 100, x: 350 },
      total: { width: 105, x: 450 }
    };

    // Table Header
    doc.rect(40, tableStartY, tableWidth, 40).fill('#f1f5f9').stroke('#e2e8f0');
    doc.fillColor('#374151')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Product', columns.product.x + 10, tableStartY + 15)
      .text('Qty', columns.qty.x + 10, tableStartY + 15)
      .text('Unit Price', columns.price.x + 10, tableStartY + 15)
      .text('Total', columns.total.x + 10, tableStartY + 15);

    let currentRowY = tableStartY + 40;

    order.items.forEach((item, index) => {
      const pageBreakOccurred = checkPageBreak(rowHeight + 20);
      
      if (pageBreakOccurred) {
        currentRowY = doc.y;
        // Redraw header on new page
        doc.rect(40, currentRowY, tableWidth, 40).fill('#f1f5f9').stroke('#e2e8f0');
        doc.fillColor('#374151')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Product', columns.product.x + 10, currentRowY + 15)
          .text('Qty', columns.qty.x + 10, currentRowY + 15)
          .text('Unit Price', columns.price.x + 10, currentRowY + 15)
          .text('Total', columns.total.x + 10, currentRowY + 15);
        currentRowY += 40;
      }

      // Alternate row colors
      const rowColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(40, currentRowY, tableWidth, rowHeight).fill(rowColor).stroke('#e2e8f0');

      // Product name with variant
      const itemName = item.variant
        ? `${item.product.name} (${item.variant.name})`
        : item.product.name;
      
      const productLines = wrapText(itemName, columns.product.width - 20, 11);
      
      doc.fillColor('#1e293b')
        .fontSize(11)
        .font('Helvetica-Bold');
      
      let textY = currentRowY + 10;
      productLines.slice(0, 2).forEach((line, lineIndex) => {
        doc.text(line, columns.product.x + 10, textY + (lineIndex * 12));
      });
      
      // SKU
      const sku = item.variant?.sku || `P-${item.product.id}`;
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(`SKU: ${sku}`, columns.product.x + 10, textY + 24);

      // Quantity
      doc.fillColor('#1e293b')
        .fontSize(12)
        .font('Helvetica')
        .text(item.quantity.toString(), columns.qty.x + 10, currentRowY + 20, { 
          align: 'center', 
          width: columns.qty.width - 20 
        });

      // Unit Price
      doc.text(`$${parseFloat(item.price.toString()).toFixed(2)}`, columns.price.x + 10, currentRowY + 20, { 
        align: 'right', 
        width: columns.price.width - 20 
      });

      // Total
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text(`$${(parseFloat(item.price.toString()) * item.quantity).toFixed(2)}`, columns.total.x + 10, currentRowY + 20, { 
          align: 'right', 
          width: columns.total.width - 20 
        });

      currentRowY += rowHeight;
    });

    doc.y = currentRowY + 30;
    logStep('items-rendered');

    // Modern Totals Section
    checkPageBreak(150);
    const totalsX = 350;
    const totalsWidth = 205;
    const totalsY = doc.y;
    
    // Calculate height based on coupon
    const hasCoupon = order.discountAmount && order.discountAmount > 0;
    const totalsHeight = hasCoupon ? 140 : 110;

    doc.rect(totalsX, totalsY, totalsWidth, totalsHeight).fill('#f8fafc').stroke('#e2e8f0');
    
    // Subtotal
    doc.fillColor('#6b7280')
      .fontSize(12)
      .font('Helvetica')
      .text('Subtotal:', totalsX + 15, totalsY + 20)
      .fillColor('#1e293b')
      .text(`$${parseFloat(order.subtotal.toString()).toFixed(2)}`, totalsX + 15, totalsY + 20, { 
        width: totalsWidth - 30, 
        align: 'right' 
      });
    
    // Shipping
    doc.fillColor('#6b7280')
      .text('Shipping:', totalsX + 15, totalsY + 40)
      .fillColor('#1e293b')
      .text(`$${parseFloat(order.shippingCost.toString()).toFixed(2)}`, totalsX + 15, totalsY + 40, { 
        width: totalsWidth - 30, 
        align: 'right' 
      });

    let finalTotalY = totalsY + 60;
    
    // Coupon discount
    if (hasCoupon) {
      doc.fillColor('#dc2626')
        .text('Discount:', totalsX + 15, totalsY + 60)
        .text(`-$${parseFloat(order.discountAmount.toString()).toFixed(2)}`, totalsX + 15, totalsY + 60, { 
          width: totalsWidth - 30, 
          align: 'right' 
        });
      
      if (order.couponCode) {
        doc.fontSize(10)
          .fillColor('#6b7280')
          .text(`(${order.couponCode})`, totalsX + 15, totalsY + 75, { 
            width: totalsWidth - 30, 
            align: 'right' 
          });
      }
      finalTotalY = totalsY + 90;
    }

    // Total line
    doc.lineWidth(1)
      .strokeColor('#e2e8f0')
      .moveTo(totalsX + 15, finalTotalY)
      .lineTo(totalsX + totalsWidth - 15, finalTotalY)
      .stroke();

    // Final Total
    doc.fillColor('#1e293b')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Total:', totalsX + 15, finalTotalY + 15)
      .text(`$${parseFloat(order.total.toString()).toFixed(2)}`, totalsX + 15, finalTotalY + 15, { 
        width: totalsWidth - 30, 
        align: 'right' 
      });

    doc.y = totalsY + totalsHeight + 30;
    logStep('totals-rendered');

    // Payment Information
    checkPageBreak(100);
    doc.fillColor('#1e293b')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Payment Information', 40, doc.y);
    
    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#475569')
      .text(`Payment Method: ${paymentMethod}`, 40, doc.y + 25);
    logStep('payment-info-rendered');
    
    
    // Purchase Order if available
    if (order.paymentOrder) {
      doc.fillColor('#475569')
        .text(`Purchase Order: ${order.paymentOrder}`, 40, doc.y + 10);
    }

    doc.y += 10;

    // Notes Section
    if (order.notes || order.adminNotes) {
      checkPageBreak(40);
      doc.fillColor('#1e293b')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Order Notes', 40, doc.y);
      
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#475569');
      
      let notesY = doc.y + 15;
      if (order.notes) {
        doc.text(`Customer Notes: ${order.notes}`, 40, notesY, { 
          width: 515, 
          align: 'left',
          lineGap: 3
        });
        notesY += 40;
      }
      if (order.adminNotes) {
        doc.text(`Admin Notes: ${order.adminNotes}`, 40, notesY, { 
          width: 515, 
          align: 'left',
          lineGap: 3
        });
        notesY += 40;
      }
      
      doc.y = notesY;
    }
    logStep('notes-rendered');

    // Stripe invoice link if available
    if (stripeInvoiceUrl) {
      checkPageBreak(50);
      doc.fillColor('#1e293b')
        .fontSize(12)
        .font('Helvetica')
        .text('Online Invoice: ', 40, doc.y, { continued: true })
        .fillColor('#2563eb')
        .text('View Invoice', { underline: true, link: stripeInvoiceUrl });
      
      doc.y += 15;
    }
    logStep('stripe-link-rendered');

    // Footer
    const footerY = doc.y;
    doc.y = footerY;
    doc.lineWidth(0.5)
      .strokeColor('#e2e8f0')
      .moveTo(40, footerY)
      .lineTo(555, footerY)
      .stroke();
    
    doc.fillColor('#6b7280')
      .fontSize(10)
      .font('Helvetica')
      .text('Thank you for your business!', 40, footerY + 15)
      .text('For questions about this invoice, contact us at support@tru-scapes.com', 40, footerY + 30)
      

    // Finalize PDF
    // doc.on('end', () => {
    //   try {
    //     const duration = Date.now() - startTime;
    //     console.log('[OrderPDF]', { orderId, event: 'doc-end', totalMs: duration });
    //   } catch {}
    // });
    logStep('doc-end-call');
    doc.end();

    // Return a stream to avoid buffering entire PDF in memory
    return { stream, filename: `order-${order.id}.pdf` };
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
    if (subtotal >= 0) {
      return 0; // Free shipping for orders $2500 and above
    }
    const shippingCost =  subtotal * 0.05; // 5% shipping for orders under $2500
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
          orderAmount: subtotal,
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
      relations: ['appliedCoupon'],
      withDeleted: true,
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

    // Record coupon usage if coupon was applied
    if (order.appliedCoupon && order.discountAmount > 0) {
        await this.couponsService.recordCouponUsage(
          order.appliedCoupon.id,
          userId,
          order.id.toString(),
          order.discountAmount,
          order.subtotal + order.shippingCost,
        );
    }

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
