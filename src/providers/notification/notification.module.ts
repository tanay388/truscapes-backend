import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { HttpModule } from '@nestjs/axios';

@Global()
@Module({
  controllers: [],
  providers: [NotificationService],
  exports: [NotificationService],
  imports: [HttpModule],
})
export class NotificationModule {}
