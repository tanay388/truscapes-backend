import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentGatewayService } from '../wallet/services/payment-gateway.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, PaymentGatewayService],
})
export class OrdersModule {}