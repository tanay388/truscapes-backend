import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { DatabaseModule } from './providers/database/database.module';
import { FirebaseModule } from './providers/firebase/firebase.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppCacheModule } from './providers/cache/app.cache.module';
import { UserModule } from './models/user/user.module';
import { NotificationModule } from './providers/notification/notification.module';
import { FirebaseUserMiddlewareExtractor } from './models/user/middleware/firebaseUserMiddlewareExtractor';
import { ProductsModule } from './models/products/products.module';
import { CategoryModule } from './models/category/category.module';
import { GalleryModule } from './models/gallery/gallery.module';
import { WalletModule } from './models/wallet/wallet.module';
import { TransactionsModule } from './models/transactions/transactions.module';
import { OrdersModule } from './models/orders/orders.module';
import { EmailModule } from './providers/email/email.module';
import { EmailsModule } from './models/emails/emails.module';
import { AnalyticsModule } from './models/analytics/analytics.module';

@Module({
  imports: [
    MulterModule.register({ dest: join(__dirname, '../public/upload') }),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: false,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 1000,
        limit: 10,
      },
    ]),
    DatabaseModule,
    FirebaseModule,
    AppCacheModule,
    NotificationModule,
    UserModule,
    ProductsModule,
    CategoryModule,
    GalleryModule,
    WalletModule,
    TransactionsModule,
    OrdersModule,
    EmailModule,
    EmailsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): any {
    consumer.apply(FirebaseUserMiddlewareExtractor).forRoutes('*');
  }
}
