import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGateway } from '../dto/repay-dues.dto';
import Stripe from 'stripe';
import * as paypal from '@paypal/checkout-server-sdk';
import { ApiContracts, ApiControllers, Constants } from 'authorizenet';

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

  constructor(private configService: ConfigService) {
    // Initialize Stripe
    this.stripe = new Stripe(process.env.STRIPE_SECRET, {
      apiVersion: '2023-10-16',
    });

    // Initialize PayPal
    const environment =
      this.configService.get('PAYPAL_ENVIRONMENT') === 'production'
        ? new paypal.core.LiveEnvironment(
            this.configService.get('PAYPAL_CLIENT_ID'),
            this.configService.get('PAYPAL_CLIENT_SECRET'),
          )
        : new paypal.core.SandboxEnvironment(
            this.configService.get('PAYPAL_CLIENT_ID'),
            this.configService.get('PAYPAL_CLIENT_SECRET'),
          );
    this.paypalClient = new paypal.core.PayPalHttpClient(environment);
  }

  async processPayment(
    gateway: PaymentGateway,
    amount: number,
    paymentData: any,
    userId: string,
    type?: string,
  ): Promise<PaymentResponse> {
    try {
      switch (gateway) {
        case PaymentGateway.STRIPE:
          return await this.createStripePaymentIntent(amount, userId, type);
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
    type?: string,
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
        payment_method_types: ['card', 'paypal'],
        metadata: {
          userId,
          type: type,
        },
        mode: 'payment',
        success_url:
          'https://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}&type={type}',
        cancel_url:
          'https://localhost:3000/cancel?session_id={CHECKOUT_SESSION_ID}&type={type}',
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
          return_url: this.configService.get('PAYPAL_RETURN_URL'),
          cancel_url: this.configService.get('PAYPAL_CANCEL_URL'),
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
        this.configService.get('AUTHORIZE_NET_API_LOGIN_ID'),
      );
      merchantAuthenticationType.setTransactionKey(
        this.configService.get('AUTHORIZE_NET_TRANSACTION_KEY'),
      );

      const creditCard = new ApiContracts.CreditCardType();
      creditCard.setCardNumber(paymentData.cardNumber);
      creditCard.setExpirationDate(paymentData.expirationDate);
      creditCard.setCardCode(paymentData.cardCode);

      const paymentType = new ApiContracts.PaymentType();
      paymentType.setCreditCard(creditCard);

      const transactionRequestType = new ApiContracts.TransactionRequestType();
      transactionRequestType.setTransactionType(
        ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION,
      );
      transactionRequestType.setPayment(paymentType);
      transactionRequestType.setAmount(amount);

      const createRequest = new ApiContracts.CreateTransactionRequest();
      createRequest.setMerchantAuthentication(merchantAuthenticationType);
      createRequest.setTransactionRequest(transactionRequestType);

      const ctrl = new ApiControllers.CreateTransactionController(
        createRequest.getJSON(),
      );

      // Set the environment
      Constants.endpoint.setEnvironment(
        this.configService.get('AUTHORIZE_NET_ENVIRONMENT') === 'production'
          ? Constants.endpoint.PRODUCTION
          : Constants.endpoint.SANDBOX,
      );

      return new Promise((resolve, reject) => {
        ctrl.execute(() => {
          const apiResponse = ctrl.getResponse();
          const response = new ApiContracts.CreateTransactionResponse(
            apiResponse,
          );

          if (
            response.getMessages().getResultCode() ===
            ApiContracts.MessageTypeEnum.OK
          ) {
            const transactionResponse = response.getTransactionResponse();
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
}
