import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { AdminEmailEntity } from 'src/models/emails/entities/admin-email.entity';
import { Order } from 'src/models/orders/entities/order.entity';

interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private adminEmails: string[] = [];
  private readonly emailStyles = `
    <style>
      .email-container {
        font-family: 'Arial', sans-serif;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
        background-color: #ffffff;
      }
      .logo {
        max-width: 200px;
        margin-bottom: 20px;
        background-color: #ffffff;
      }
      h1 {
        color: #333333;
        font-size: 24px;
        margin-bottom: 20px;
      }
      p {
        color: #666666;
        font-size: 16px;
        line-height: 1.6;
        margin-bottom: 15px;
      }
      .button {
        display: inline-block;
        background-color: #4CAF50;
        color: #ffffff;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 4px;
        margin: 20px 0;
      }
      .details {
        background-color: #f9f9f9;
        padding: 15px;
        border-radius: 4px;
        margin: 20px 0;
      }
      .footer {
        text-align: center;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #eeeeee;
        color: #999999;
        font-size: 14px;
      }
    </style>
  `;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user:
          process.env.SMTP_USER || this.configService.get<string>('SMTP_USER'),
        pass:
          process.env.SMTP_PASSWORD ||
          this.configService.get<string>('SMTP_PASSWORD'),
      },
    });

    // this.loadadminEmails();
  }

  public async loadadminEmails(emails: string[]) {
    // const emails = await AdminEmailEntity.find();
    this.adminEmails = emails;
  }

  private wrapInTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${this.emailStyles}
        </head>
        <body>
          <div class="email-container">
            
            ${content}
            <div class="footer">
              <p>© ${new Date().getFullYear()} Tru-Scapes®. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // <div class="header">
  //             <img src="https://tru-scapes.com/wp-content/uploads/2023/12/site-logo.png.webp" alt="Tru-Scapes Logo" class="logo">
  //           </div>

  async sendEmail({ to, cc, subject, html }: EmailOptions) {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: `Tru-Scapes® <${process.env.SMTP_USER || this.configService.get<string>('SMTP_USER')}>`,
        to,
        cc,
        subject,
        html: this.wrapInTemplate(html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Account Creation Emails
  async sendAccountPendingEmail(to: string, customerName: string) {
    return this.sendEmail({
      to,
      subject: 'Your Tru-Scapes® Account Has Been Created—Just One More Step!',
      html: `
        <p>Hello ${customerName},</p>
        <p>Thanks for signing up with Tru-Scapes®! We're excited to have you onboard. Your new account has been successfully created. Before you can begin using the account, our team needs to review and approve it. This typically takes 24-48 hours.</p>
        <div class="details">
          <h2>What to expect next:</h2>
          <p>Review & Approval: Our team will review your registration to ensure the best experience.</p>
          <p>Confirmation Email: Once approved, we'll send you another email letting you know that your account is fully active.</p>
        </div>
        <p>In the meantime, feel free to explore our website and check out our services. If you have any questions, just hit reply, and we'll be happy to help.</p>
        <p>Thank you for choosing Tru-Scapes!</p>
        <p>The Tru-Scapes® Team</p>
      `,
    });
  }

  async sendAccountApprovedEmail(to: string, customerName: string) {
    return this.sendEmail({
      to,
      subject: 'Good News! Your Tru-Scapes® Account Is Now Approved',
      html: `
        <p>Hello ${customerName},</p>
        <p>We're happy to let you know that your Tru-Scapes® account has been approved! You can now log in and start enjoying all the features our platform has to offer.</p>
        <div class="details">
          <h2>Next steps:</h2>
          <p>Log In: Access your account with your email and password.</p>
          <p>Explore & Enjoy: Browse our services, request quotes, place orders, and get the most out of Tru-Scapes®!</p>
        </div>
        <p>If you have any questions or need assistance, reply to this email and we'll gladly help.</p>
        <p>Thank you,</p>
        <p>The Tru-Scapes® Team</p>
      `,
    });
  }

  async sendPasswordResetNotificationEmail(to: string, customerName: string, newPassword: string) {
    return this.sendEmail({
      to,
      subject: 'Your Tru-Scapes® Password Has Been Reset',
      html: `
        <p>Hello ${customerName},</p>
        <p>Your password has been reset by an administrator. You can now log in to your Tru-Scapes® account using your new password.</p>
        <div class="details">
          <h2>Your New Login Credentials:</h2>
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>New Password:</strong> ${newPassword}</p>
        </div>
        <p><strong>Important Security Notice:</strong> For your security, we strongly recommend that you change this password after logging in. You can do this by going to your account settings.</p>
        <p>If you did not request this password reset or have any concerns about your account security, please contact our support team immediately.</p>
        <p>Thank you,</p>
        <p>The Tru-Scapes® Team</p>
      `,
    });
  }

  async sendPasswordResetLinkEmail(to: string, customerName: string, resetLink: string) {
    return this.sendEmail({
      to,
      subject: 'Reset Your Tru-Scapes® Password',
      html: `
        <p>Hello ${customerName},</p>
        <p>We received a request to reset your password for your Tru-Scapes® account. If you made this request, please click the button below to reset your password.</p>
        <div class="details">
          <p style="text-align: center;">
            <a href="${resetLink}" class="button" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Your Password</a>
          </p>
          <p><strong>Or copy and paste this link into your browser:</strong></p>
          <p style="word-break: break-all; background-color: #f9f9f9; padding: 10px; border-radius: 4px;">${resetLink}</p>
        </div>
        <p><strong>Important:</strong> This link will expire in 1 hour for security reasons. If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.</p>
        <p>If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
        <p>Thank you,</p>
        <p>The Tru-Scapes® Team</p>
      `,
    });
  }

  async sendNewAccountNotificationToAdmin(customerDetails: any) {
    return this.sendEmail({
      to: this.adminEmails,
      subject: `New Account Pending Approval: ${customerDetails.email}`,
      html: `
        <p>Hello Admin,</p>
        <p>A new user, ${customerDetails.email}, has just signed up and their account is awaiting your approval. Please review their details to ensure they meet the Tru-Scapes® criteria and then proceed with the approval process.</p>
        <div class="details">
          <h2>User Details:</h2>
          <p>Email: ${customerDetails.email}</p>
          <p>Signup Date: ${new Date().toLocaleDateString()}</p>
        </div>
        <p>Thank you,</p>
        <p>The Tru-Scapes® Team</p>
      `,
    });
  }

  // Wallet Emails
  async sendWalletUpdateEmail(
    to: string,
    customerName: string,
    amount: number,
  ) {
    return this.sendEmail({
      to,
      subject: 'Your Tru-Scapes® Wallet Has Been Updated',
      html: `
        <p>Hello ${customerName},</p>
        <p>Great news! Your Tru-Scapes® wallet was just Credited with $${amount}.</p>
        <div class="details">
          <h2>Transaction details:</h2>
          <p>Type: Credit</p>
          <p>Amount: $${amount}</p>
        </div>
        <p>You can review your full transaction history and wallet balance anytime from your Dashboard.</p>
        <p>If anything looks incorrect or you have questions, we're always here to help.</p>
        <p>Cheers,</p>
        <p>The Tru-Scapes® Team</p>
      `,
    });
  }

  // Wallet Emails
  async sendWalletBalanceUpdateEmail(
    to: string,
    customerName: string,
    amount: number,
  ) {
    return this.sendEmail({
      to,
      subject: 'Your Tru-Scapes® Wallet Has Been Updated',
      html: `
        <p>Hello ${customerName},</p>
        <p>Great news! Your Tru-Scapes® wallet was just updated with new balnce as <strong> $${amount} </strong>.</p>
        <div class="details">
          <h2>Transaction details:</h2>
          <p>Type: Balance updated by Admin</p>
          <p>New Balance: $${amount}</p>
        </div>
        <p>You can review your full transaction history and wallet balance anytime from your Dashboard.</p>
        <p>If anything looks incorrect or you have questions, we're always here to help.</p>
        <p>Cheers,</p>
        <p>The Tru-Scapes® Team</p>
      `,
    });
  }

  async sendPaymentRequestEmail(
    to: string,
    customerName: string,
    amount: number,
    paymentLink: string,
  ) {
    return this.sendEmail({
      to,
      subject: 'Payment Request for Your Wallet Balance Payment',
      html: `
        <p>Hello ${customerName},</p>
        <p>We hope you've been enjoying Tru-Scapes®! Earlier, we provided a temporary credit to your Tru-Scapes® wallet to help you get started with your orders. Now that the agreed-upon period has passed, we kindly request that you settle the remaining amount.</p>
        <div class="details">
          <h2>Payment details:</h2>
          <p>Amount Due: $${amount}</p>
        </div>
        <a href="${paymentLink}" class="button">Pay Now</a>
        <p>Once payment is completed, you'll continue enjoying all the benefits and features Tru-Scapes® has to offer. If you have any questions or concerns, simply reply to this email, and we'll be happy to assist you.</p>
        <p>Thank you,</p>
        <p>The Tru-Scapes® Team</p>
      `,
    });
  }

  // Order Emails
  async sendOrderConfirmationEmail(
    to: string,
    customerName: string,
    orderDetails: Order
  ) {
    return this.sendEmail({
      to,
      subject: `Your New Tru-Scapes® Order #${orderDetails.id} - ${orderDetails.items[0].product.name} [] ${orderDetails.items.length } items ] Is Confirmed`,
      html: `
        <p>Hello ${customerName},</p>
        <p>Thanks for choosing Tru-Scapes®! We're excited to let you know that your order Id: #${orderDetails.id} is confirmed and is now being processed.</p>
        <div class="details">
          <h2>Order Details:</h2>
          <div class="order-summary">
            <p><strong>Order ID:</strong> #${orderDetails.id}</p>
            <p><strong>Order Date:</strong> ${new Date(orderDetails.createdAt).toLocaleDateString()}</p>
            <p><strong>Order Status:</strong> ${orderDetails.status}</p>
            <p><strong>Purchase Order:</strong> ${orderDetails.paymentOrder || 'N/A'}</p>
            <p><strong>Shipping Cost:</strong> $${parseFloat(orderDetails.shippingCost.toString()).toFixed(2)}</p>
          </div>

          <h3>Ordered Items:</h3>
          <table class="items-table" style="width: 100%; border-collapse: collapse; margin: 10px 0;">
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Product</th>
              <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">SKU</th>
              <th style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">Quantity</th>
              <th style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">Price</th>
              <th style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">Total</th>
            </tr>
            ${orderDetails.items
              .map(
                (item: any) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">
                    ${item.product.name}
                    ${item.variant ? `<br><small>Variant: ${item.variant.name}</small>` : ''}
                  </td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${item.product.id || 'N/A'}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">${item.quantity}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">$${parseFloat(item.price.toString()).toFixed(2)}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">$${parseFloat(item.total.toString()).toFixed(2)}</td>
                </tr>
              `).join('')}
            <tr style="background-color: #f8f9fa;">
              <td colspan="4" style="padding: 8px; border: 1px solid #dee2e6; text-align: right;"><strong>Subtotal:</strong></td>
              <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">$${parseFloat(orderDetails.subtotal.toString()).toFixed(2)}</td>
            </tr>

            <tr style="background-color: #f8f9fa;">
              <td colspan="4" style="padding: 8px; border: 1px solid #dee2e6; text-align: right;"><strong>Total:</strong></td>
              <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;"><strong>$${parseFloat(orderDetails.total.toString()).toFixed(2)}</strong></td>
            </tr>
          </table>

          <div class="address-section">
            <div class="shipping-address">
              <h3>Shipping Address:</h3>
              <p>${orderDetails.shippingAddress.street}<br/>
                 ${orderDetails.shippingAddress.city}, ${orderDetails.shippingAddress.state}<br/>
                 ${orderDetails.shippingAddress.country}, ${orderDetails.shippingAddress.zipCode}<br/>
                 Phone: ${orderDetails.shippingAddress.phone}</p>
            </div>
            <div class="billing-address">
              <h3>Billing Address:</h3>
              <p>${orderDetails.shippingAddress.street}<br/>
                 ${orderDetails.shippingAddress.city}, ${orderDetails.shippingAddress.state}<br/>
                 ${orderDetails.shippingAddress.country}, ${orderDetails.shippingAddress.zipCode}<br/>
                 Phone: ${orderDetails.shippingAddress.phone}</p>
            </div>
          </div>
        </div>
        <p>You can view and manage your order anytime in your Order History.</p>
        <p>If you have questions, we're always just an email away!</p>
        <p>Thank you for your business,</p>
        <p>The Tru-Scapes Team</p>
      `,
    });
  }

  async sendNewOrderNotificationToAdmin(orderDetails: Order) {
    return this.sendEmail({
      to: this.adminEmails,
      subject: `New Order Alert: #${orderDetails.id} from ${orderDetails.user.name}`,
      html: `
        <p>Hello Admin,</p>
        <p>A new order has just been received and requires your attention!</p>
        <div class="details">
          <div class="order-summary">
            <h2>Order Overview:</h2>
            <p><strong>Order ID:</strong> #${orderDetails.id}</p>
            <p><strong>Order Date:</strong> ${new Date(orderDetails.createdAt).toLocaleString()}</p>
            <p><strong>Order Status:</strong> ${orderDetails.status}</p>
            <p><strong>Purchase Order:</strong> ${orderDetails.paymentOrder || 'N/A'}</p>
            <p><strong>Shipping Cost:</strong> $${parseFloat(orderDetails.shippingCost.toString()).toFixed(2)}</p>
          </div>

          <div class="customer-info">
            <h2>Customer Information:</h2>
            <p><strong>Name:</strong> ${orderDetails.user.name} </p>
            <p><strong>Email:</strong> ${orderDetails.user.email}</p>
            <p><strong>Phone:</strong> ${orderDetails.user.phone || 'N/A'}</p>


            <p><strong>Company Name:</strong> ${orderDetails.user.company} </p>
            <p><strong>Company Address:</strong> ${orderDetails.user.companyAddress}</p>
            <p><strong>Company Website:</strong> ${orderDetails.user.companyWebsite}</p>
          </div>

          <h2>Order Details:</h2>
          <table class="items-table" style="width: 100%; border-collapse: collapse; margin: 10px 0;">
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Product</th>
              <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">SKU</th>
              <th style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">Quantity</th>
              <th style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">Price</th>
              <th style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">Total</th>
            </tr>
            ${orderDetails.items
              .map(
                (item: any) => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">
                    ${item.product.name}
                    ${item.variant ? `<br><small>Variant: ${item.variant.name}</small>` : ''}
                  </td>
                  <td style="padding: 8px; border: 1px solid #dee2e6;">${item.product.id || 'N/A'}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center;">${item.quantity}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">$${parseFloat(item.price.toString()).toFixed(2)}</td>
                  <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">$${parseFloat(item.total.toString()).toFixed(2)}</td>
                </tr>
              `).join('')}
            <tr style="background-color: #f8f9fa;">
              <td colspan="4" style="padding: 8px; border: 1px solid #dee2e6; text-align: right;"><strong>Subtotal:</strong></td>
              <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;">$${parseFloat(orderDetails.subtotal.toString()).toFixed(2)}</td>
            </tr>

            <tr style="background-color: #f8f9fa;">
              <td colspan="4" style="padding: 8px; border: 1px solid #dee2e6; text-align: right;"><strong>Total:</strong></td>
              <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right;"><strong>$${parseFloat(orderDetails.total.toString()).toFixed(2)}</strong></td>
            </tr>
          </table>

          <div class="address-section">
            <div class="shipping-address">
              <h3>Shipping Address:</h3>
              <p>${orderDetails.shippingAddress.street}<br/>
                 ${orderDetails.shippingAddress.city}, ${orderDetails.shippingAddress.state}<br/>
                 ${orderDetails.shippingAddress.country}, ${orderDetails.shippingAddress.zipCode}<br/>
                 Phone: ${orderDetails.shippingAddress.phone}</p>
            </div>
            <div class="billing-address">
              <h3>Billing Address:</h3>
              <p>${orderDetails.shippingAddress.street}<br/>
                 ${orderDetails.shippingAddress.city}, ${orderDetails.shippingAddress.state}<br/>
                 ${orderDetails.shippingAddress.country}, ${orderDetails.shippingAddress.zipCode}<br/>
                 Phone: ${orderDetails.shippingAddress.phone}</p>
            </div>
          </div>

          <div class="notes-section">
            ${orderDetails.notes ? `
            <h3>Order Notes:</h3>
            <p>${orderDetails.notes}</p>
            ` : ''}
          </div>
        </div>
        <p>Please review this order and process it according to our standard procedures. Remember to check inventory levels and shipping requirements.</p>
        <p>Best regards,</p>
        <p>Tru-Scapes® System</p>
      `,
    });
  }

  async sendOrderStatusUpdateEmail(
    to: string,
    customerName: string,
    orderDetails: Order,
    newStatus: string
  ) {
    return this.sendEmail({
      to,
      subject: `Update on Your Tru-Scapes® Order ${orderDetails.id}`,
      html: `
        <p>Hello ${customerName},</p>
        <p>We've got some news about your order Id: #${orderDetails.id}:</p>
        <div class="details">
          <h2>Order Status Update:</h2>
          <div class="order-summary">
            <p><strong>Order ID:</strong> #${orderDetails.id}</p>
            <p><strong>Order Date:</strong> ${new Date(orderDetails.createdAt).toLocaleDateString()}</p>
            <p><strong>Current Status:</strong> ${newStatus}</p>
            <p><strong>Purchase Order:</strong> ${orderDetails.paymentOrder || 'N/A'}</p>
          </div>

          <div class="items-table">
            <h2>Order Items:</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6;">Product</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6;">SKU</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">Quantity</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">Price</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">Total</th>
              </tr>
              ${orderDetails.items.map(item => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">
                    ${item.product.name}
                    ${item.variant ? `<br><small>(${item.variant.name})</small>` : ''}
                  </td>
                  <td style="padding: 10px; border: 1px solid #dee2e6;">${item.product.id}</td>
                  <td style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">${item.quantity}</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${parseFloat(item.price.toString()).toFixed(2)}</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${(parseFloat(item.price.toString()) * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr>
                <td colspan="4" style="padding: 10px; text-align: right; border: 1px solid #dee2e6;"><strong>Subtotal:</strong></td>
                <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${parseFloat(orderDetails.subtotal.toString()).toFixed(2)}</td>
              </tr>
              ${orderDetails.shippingCost ? `
                <tr>
                  <td colspan="4" style="padding: 10px; text-align: right; border: 1px solid #dee2e6;"><strong>Delivery charges:</strong></td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">$${parseFloat(orderDetails.shippingCost.toString()).toFixed(2)}</td>
                </tr>
              ` : ''}
              <tr>
                <td colspan="4" style="padding: 10px; text-align: right; border: 1px solid #dee2e6;"><strong>Total:</strong></td>
                <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;"><strong>$${parseFloat(orderDetails.total.toString()).toFixed(2)}</strong></td>
              </tr>
            </table>
          </div>

          <div class="addresses">
            <div class="shipping-address">
              <h2>Shipping Address:</h2>
              <p>${orderDetails.shippingAddress.street}</p>
              <p>${orderDetails.shippingAddress.city}, ${orderDetails.shippingAddress.state}</p>
              <p>${orderDetails.shippingAddress.country}, ${orderDetails.shippingAddress.zipCode}</p>
            </div>
            ${orderDetails.shippingAddress ? `
              <div class="billing-address">
                <h2>Billing Address:</h2>
                <p>${orderDetails.shippingAddress.street}</p>
                <p>${orderDetails.shippingAddress.city}, ${orderDetails.shippingAddress.state}</p>
                <p>${orderDetails.shippingAddress.country}, ${orderDetails.shippingAddress.zipCode}</p>
              </div>
            ` : ''}
          </div>
        </div>
        <p>We're working to ensure everything goes smoothly. If you have any questions or need more info, just reply to this email, and we'll be happy to help.</p>
        <p>Track your order anytime: <a href="https://shop.tru-scapes.com/">Our Website</a>.</p>
        <p>Thank you,</p>
        <p>The Tru-Scapes Team</p>
      `,
    });
  }

  async sendOrderDeliveredEmail(
    to: string,
    customerName: string,
    orderId: string,
  ) {
    return this.sendEmail({
      to,
      subject: `Your Tru-Scapes® Order ${orderId} Is Complete!`,
      html: `
        <p>Hello ${customerName},</p>
        <p>Happy day! Your order Id: #${orderId} has been successfully delivered.</p>
        <p>We hope everything meets (or even exceeds) your expectations. If you love what you received, consider leaving a review to help other customers make informed decisions.</p>
        <p>Need help or have questions? Just hit reply, and we'll be there for you.</p>
        <p>Thanks for choosing Tru-Scapes®!</p>
        <p>Best,</p>
        <p>The Tru-Scapes® Team</p>
      `,
    });
  }
}
