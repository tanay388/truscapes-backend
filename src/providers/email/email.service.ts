import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private adminEmails: string[] = [
    'tanay.deo388@gmail.com',
    'suhail@tru-scapes.com',
  ];
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
            <div class="header">
              <img src="https://tru-scapes.com/wp-content/uploads/2023/12/truscapes-lighting-logo-2048x598.png.webp" alt="Tru-Scapes Logo" class="logo">
            </div>
            ${content}
            <div class="footer">
              <p>© ${new Date().getFullYear()} Tru-Scapes®. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async sendEmail({ to, cc, subject, html }: EmailOptions) {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: this.configService.get<string>('SMTP_USER'),
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

  async sendPaymentRequestEmail(
    to: string,
    customerName: string,
    orderId: string,
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
          <p>Order ID: ${orderId}</p>
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
    orderDetails: any,
  ) {
    return this.sendEmail({
      to,
      subject: `Your New Tru-Scapes® Order ${orderDetails.items[0].product.name} Is Confirmed`,
      html: `
        <p>Hello ${customerName},</p>
        <p>Thanks for choosing Tru-Scapes®! We're excited to let you know that your order Id: #${orderDetails.id} is confirmed and is now being processed.</p>
        <div class="details">
          <h2>Order Details:</h2>
          <p>Items/Service: </p>
          <ul>
            ${orderDetails.items
              .map(
                (item: any) =>
                  `<li>${item.product.name} (${item.quantity}) = $${item.total}</li>`,
              )
              .join('')}
          </ul>
        </div>
        <p>You can view and manage your order anytime in your Order History.</p>
        <p>If you have questions, we're always just an email away!</p>
        <p>Thank you,</p>
        <p>The Tru-Scapes Team</p>
      `,
    });
  }

  async sendNewOrderNotificationToAdmin(orderDetails: any) {
    return this.sendEmail({
      to: this.adminEmails,
      subject: `New Order Alert: ${orderDetails.items[0].product.name} by ${orderDetails.user.name}`,
      html: `
        <p>Hello Admin,</p>
        <p>A new order has just rolled in!</p>
        <div class="details">
          <h2>Order Details:</h2>
          <p>Order ID: ${orderDetails.id}</p>
          <p>Customer: ${orderDetails.user.name} (${orderDetails.user.email})</p>
          <p>Items/Service:</p>
           <ul>
            ${orderDetails.items
              .map(
                (item: any) =>
                  `<li>${item.product.name} (${item.quantity}) = $${item.total}</li>`,
              )
              .join('')}
          </ul>
          <p>Date: ${new Date().toLocaleString()}</p>
        </div>
        <p>Please review and ensure everything is in motion to deliver a top-notch experience.</p>
        <p>Best,</p>
        <p>Tru-Scapes®</p>
      `,
    });
  }

  async sendOrderStatusUpdateEmail(
    to: string,
    customerName: string,
    orderId: string,
    newStatus: string,
  ) {
    return this.sendEmail({
      to,
      subject: `Update on Your Tru-Scapes® Order ${orderId}`,
      html: `
        <p>Hello ${customerName},</p>
        <p>We've got some news about your order Id: #${orderId}:</p>
        <div class="details">
          <p>Current Status: ${newStatus}</p>
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
