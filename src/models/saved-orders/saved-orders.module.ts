import { Module } from '@nestjs/common';
import { SavedOrdersService } from './saved-orders.service';
import { SavedOrdersController } from './saved-orders.controller';

@Module({
  controllers: [SavedOrdersController],
  providers: [SavedOrdersService],
  exports: [SavedOrdersService],
})
export class SavedOrdersModule {}
