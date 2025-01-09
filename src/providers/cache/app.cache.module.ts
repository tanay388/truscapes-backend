import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

/**
 * This module is responsible for caching data in System RAM. 
 * You may configure Redis is required.
 * The cache is set to expire after 5 minutes and will store up to 30,000 items.
 * The cache is also set to be global, meaning it can be accessed from any part of the application.
 */
@Module({
  imports: [CacheModule.register({ ttl: 5000, max: 30000, isGlobal: true })],
})
export class AppCacheModule {}
