import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailsModule } from 'src/models/emails/emails.module';

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}