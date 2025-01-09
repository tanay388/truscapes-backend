import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Cache } from 'cache-manager';
import { ApiRequest } from '../entities/api-request.entity';

@Injectable()
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly CACHE_KEY = 'error_logs';
  private readonly CACHE_TTL = 900000; // 10 minutes
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = {
      path: request.url,
      userId: (request.user as any)?.uid,
      method: request.method,
      status: status,
      message: exception.message || null,
      headers: request.headers,
      body: request.body,
      ip: this.getIpAddress(request),
      timestamp: new Date().toISOString(), // Store timestamp
    };

    // Handle error caching and batch insertion
    await this.logErrorToCache(errorResponse);

    // Respond with error
    response.status(status).json(exception);
  }

  private async logErrorToCache(errorResponse: any) {
    const currentLogs =
      (await this.cacheManager.get<any[]>(this.CACHE_KEY)) || [];
    currentLogs.push(errorResponse);
    await this.cacheManager.set(this.CACHE_KEY, currentLogs, this.CACHE_TTL);
    // console.log('Error logged to cache: ', errorResponse);
  }

  private getIpAddress(request: any): string {
    let ip = request.ip || request.connection.remoteAddress;

    // Check for proxy forwarded IP
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      ip = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
    }

    // Remove IPv6 prefix if present
    ip = ip.replace(/^::ffff:/, '');

    // If it's still an IPv6 localhost, return IPv4 localhost
    if (ip === '::1') {
      return '127.0.0.1';
    }

    return ip;
  }

  @Interval(60000) // Run every 10 minutes (600000 ms)
  async saveErrorsToDB() {
    const errors = await this.cacheManager.get<any[]>(this.CACHE_KEY);
    if (errors && errors.length > 0) {
      await ApiRequest.save(errors);
      await this.cacheManager.del(this.CACHE_KEY);
    }
  }
}
