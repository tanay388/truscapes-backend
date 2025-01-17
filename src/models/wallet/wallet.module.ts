import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { TransactionsService } from '../transactions/transactions.service';
import { PaymentGatewayService } from './services/payment-gateway.service';

@Module({
  controllers: [WalletController],
  providers: [WalletService, TransactionsService, PaymentGatewayService],
})
export class WalletModule {}