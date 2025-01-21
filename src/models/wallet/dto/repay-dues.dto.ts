import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentGateway {
  PAYPAL = 'PAYPAL',
  AUTHORIZE_NET = 'AUTHORIZE_NET',
  STRIPE = 'STRIPE',
  WALLET = 'WALLET',
}

export class CardInfo {
  @ApiProperty({
    description: 'Credit card number',
    example: '4111111111111111'
  })
  @IsString()
  cardNumber: string;

  @ApiProperty({
    description: 'Card expiration date (MMYY)',
    example: '1225'
  })
  @IsString()
  expirationDate: string;

  @ApiProperty({
    description: 'Card security code',
    example: '123'
  })
  @IsString()
  cardCode: string;
}

export class RepayDuesDto {
  @ApiProperty({
    description: 'Amount to repay',
    example: 100.00,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Payment gateway to use',
    enum: PaymentGateway,
    example: PaymentGateway.STRIPE
  })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @ApiProperty({
    description: 'Payment token from the gateway (required for PayPal/Stripe confirmation)',
    example: 'tok_visa',
    required: false
  })
  @IsString()
  @IsOptional()
  @ValidateIf(o => o.gateway !== PaymentGateway.AUTHORIZE_NET)
  paymentToken?: string;

  @ApiProperty({
    description: 'Card information (required for Authorize.NET)',
    type: CardInfo,
    required: false
  })
  @ValidateIf(o => o.gateway === PaymentGateway.AUTHORIZE_NET)
  cardInfo?: CardInfo;

  @ApiProperty({
    description: 'Description for the payment',
    example: 'Repaying credit dues',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string;
}