import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentGatewayService } from '../wallet/services/payment-gateway.service';
import { EmailModule } from 'src/providers/email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [OrdersController],
  providers: [OrdersService, PaymentGatewayService],
})
export class OrdersModule {}
