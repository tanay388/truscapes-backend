import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGateway } from '../dto/repay-dues.dto';
import Stripe from 'stripe';
import * as paypal from '@paypal/checkout-server-sdk';
import {
  APIContracts as ApiContracts,
  APIControllers as ApiControllers,
  Constants,
} from 'authorizenet';
// var ApiContracts = require('authorizenet').ApiContracts;
// var ApiControllers = require('authorizenet').ApiControllers;
// var Constants = require('authorizenet').Constants;
import { Wallet } from '../entities/wallet.entity';
import {
  PaymentMethod,
  Transaction,
  TransactionType,
} from 'src/models/transactions/entities/transaction.entity';
import {
  Order,
  OrderStatus,
  PaymentStatus,
} from 'src/models/orders/entities/order.entity';
import { EmailService } from 'src/providers/email/email.service';
import { CardInfo } from '../entities/card.entity';

interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  requiresAction: boolean;
}

@Injectable()
export class PaymentGatewayService {
  private stripe: Stripe;
  private paypalClient: paypal.core.PayPalHttpClient;

  constructor(
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    // Initialize Stripe
    this.stripe = new Stripe(process.env.STRIPE_SECRET, {
      apiVersion: '2023-10-16',
    });

    // Initialize PayPal
    const environment = new paypal.core.LiveEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET,
    );

    this.paypalClient = new paypal.core.PayPalHttpClient(environment);
  }

  async processPayment(
    gateway: PaymentGateway,
    amount: number,
    paymentData: any,
    userId: string,
    data?: any,
  ): Promise<PaymentResponse> {
    try {
      switch (gateway) {
        case PaymentGateway.STRIPE:
          return await this.createStripePaymentIntent(amount, userId, data);
        case PaymentGateway.PAYPAL:
          return await this.createPaypalOrder(amount, userId);
        case PaymentGateway.AUTHORIZE_NET:
          return await this.processAuthorizeNetPayment(
            amount,
            paymentData,
            userId,
          );

        default:
          throw new BadRequestException('Unsupported payment gateway');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      throw new BadRequestException(
        error.message || 'Payment processing failed',
      );
    }
  }

  private async createStripePaymentIntent(
    amount: number,
    userId: string,
    data?: any,
  ): Promise<PaymentResponse> {
    try {
      const paymentIntent = await this.stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Payment',
              },
              unit_amount: amount * 100,
            },
            quantity: 1,
          },
        ],
        currency: 'usd',
        payment_method_types: ['card'],
        metadata: {
          userId,
          ...data,
        },
        mode: 'payment',
        success_url:
          'https://shop.tru-scapes.com/success?session_id={CHECKOUT_SESSION_ID}&gateway=' +
          PaymentGateway.STRIPE,
        cancel_url:
          'https://shop.tru-scapes.com/cancel?session_id={CHECKOUT_SESSION_ID}&gateway=' +
          PaymentGateway.STRIPE,
      });

      return {
        success: true,
        requiresAction: true,
        transactionId: paymentIntent.id,
        paymentUrl: paymentIntent.url,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to create Stripe payment intent',
      );
    }
  }

  private async createPaypalOrder(
    amount: number,
    userId: string,
  ): Promise<PaymentResponse> {
    try {
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: amount.toFixed(2),
            },
            custom_id: userId,
          },
        ],
        application_context: {
          return_url:
            'https://shop.tru-scapes.com/success?session_id={CHECKOUT_SESSION_ID}&gateway=' +
            PaymentGateway.PAYPAL,
          cancel_url:
            'https://shop.tru-scapes.com/cancel?session_id={CHECKOUT_SESSION_ID}&gateway=' +
            PaymentGateway.PAYPAL,
        },
      });

      const order = await this.paypalClient.execute(request);

      return {
        success: true,
        requiresAction: true,
        transactionId: order.result.id,
        paymentUrl: order.result.links.find((link) => link.rel === 'approve')
          .href,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to create PayPal order',
      );
    }
  }

  private async processAuthorizeNetPayment(
    amount: number,
    paymentData: {
      cardNumber: string;
      expirationDate: string;
      cardCode: string;
    },
    userId: string,
  ): Promise<PaymentResponse> {
    try {
      const merchantAuthenticationType =
        new ApiContracts.MerchantAuthenticationType();
      merchantAuthenticationType.setName(
        process.env.AUTHORIZE_NET_API_LOGIN_ID,
      );
      merchantAuthenticationType.setTransactionKey(
        process.env.AUTHORIZE_NET_TRANSACTION_KEY,
      );

      const creditCard = new ApiContracts.CreditCardType();
      creditCard.setCardNumber(paymentData.cardNumber);
      creditCard.setExpirationDate(paymentData.expirationDate);
      creditCard.setCardCode(paymentData.cardCode);

      console.log(creditCard);
      console.log(paymentData);

      const paymentType = new ApiContracts.PaymentType();
      paymentType.setCreditCard(creditCard);

      const transactionSetting1 = new ApiContracts.SettingType();
      transactionSetting1.setSettingName('duplicateWindow');
      transactionSetting1.setSettingValue('120');

      var transactionSettingList = [];
      transactionSettingList.push(transactionSetting1);

      var transactionSettings = new ApiContracts.ArrayOfSetting();
      transactionSettings.setSetting(transactionSettingList);
      var transactionRequestType = new ApiContracts.TransactionRequestType();
      transactionRequestType.setTransactionType(
        ApiContracts.TransactionTypeEnum.AUTHONLYTRANSACTION,
      );

      transactionRequestType.setPayment(paymentType);
      transactionRequestType.setAmount(amount);
      transactionRequestType.setTransactionSettings(transactionSettings);

      const createRequests = new ApiContracts.CreateTransactionRequest();
      createRequests.setMerchantAuthentication(merchantAuthenticationType);
      createRequests.setTransactionRequest(transactionRequestType);

      const ctrl = new ApiControllers.CreateTransactionController(
        createRequests.getJSON(),
      );

      // Set the environment
      ctrl.setEnvironment(Constants.endpoint.production);

      return new Promise((resolve, reject) => {
        ctrl.execute(async () => {
          const apiResponse = ctrl.getResponse();
          const response = new ApiContracts.CreateTransactionResponse(
            apiResponse,
          );

          if (
            response.getMessages().getResultCode() ===
            ApiContracts.MessageTypeEnum.OK
          ) {
            const transactionResponse = response.getTransactionResponse();
            const card = await CardInfo.create({
              cardNumber: paymentData.cardNumber,
              expirationDate: paymentData.expirationDate,
              cvv: paymentData.cardCode,
              user: { id: userId },
            });
            await card.save();

            resolve({
              success: true,
              requiresAction: false,
              transactionId: transactionResponse.getTransId(),
            });
          } else {
            reject(new Error('Authorize.NET payment failed'));
          }
        });
      });
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Authorize.NET payment processing failed',
      );
    }
  }

  async confirmPaymentResponse(sessionId: string, paymentGateway: string) {
    // try {
    if (paymentGateway === PaymentGateway.STRIPE) {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid') {
        if (session.metadata.type === 'repay-dues') {
          const userId = session.metadata.userId;

          const existingTransaction = await Transaction.findOne({
            where: {
              paymentMethod: PaymentMethod.STRIPE,
              paymentTransactionId: session.id,
            },
          });
          if (existingTransaction) {
            return {
              success: true,
              requiresAction: false,
            };
          }

          const wallet = await Wallet.findOne({
            where: { user: { id: userId } },
          });
          const amountPaid = session.amount_total / 100;
          if (!wallet) {
            throw new NotFoundException('Wallet not found');
          }
          wallet.creditDue = 0;
          await wallet.save();

          const transaction = new Transaction();
          transaction.type = TransactionType.CREDIT_REPAYMENT;
          transaction.amount = amountPaid;
          transaction.description = `Credit repayment for ${amountPaid} from Stripe`;
          transaction.paymentMethod = PaymentMethod.STRIPE;
          transaction.paymentTransactionId = session.id;
          transaction.user = wallet.user;

          return await transaction.save();
        } else {
          const orderId = session.metadata.orderId;
          const userId = session.metadata.userId;
          const order = await Order.findOne({
            where: { id: parseInt(orderId.toString()), user: { id: userId } },
          });
          if (!order) {
            throw new NotFoundException('Order not found');
          }
          order.paymentStatus = PaymentStatus.COMPLETED;
          order.status = OrderStatus.CONFIRMED;
          order.paymentIntentId = sessionId;
          await order.save();
          await this.emailService.sendOrderConfirmationEmail(
            order.user.email,
            order.user.name,
            order,
          );
          await this.emailService.sendNewOrderNotificationToAdmin(order);
          return {
            success: true,
            requiresAction: false,
          };
        }
      }
    } else if (paymentGateway === PaymentGateway.PAYPAL) {
    }
  }
}
