import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { TransactionsService } from '../transactions/transactions.service';
import { PaymentGatewayService } from './services/payment-gateway.service';
import { EmailModule } from 'src/providers/email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [WalletController],
  providers: [WalletService, TransactionsService, PaymentGatewayService],
})
export class WalletModule {}