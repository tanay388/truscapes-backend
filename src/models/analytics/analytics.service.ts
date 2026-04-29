import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { DashboardStatsDto } from './dto/dashboard.dto';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AnalyticsService {
  private readonly dashboardCacheKey = 'analytics:dashboard';
  private readonly dashboardCacheTtl = 6 * 60 * 60 * 1000;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cachedDashboard = await this.cacheManager.get<DashboardStatsDto>(
      this.dashboardCacheKey,
    );

    if (cachedDashboard) {
      return cachedDashboard;
    }

    const [
      totalOrders,
      pendingOrders,
      totalProducts,
      activeUsers,
      todayRevenue,
      ordersSummary,
      revenueTrends,
    ] = await Promise.all([
      Order.count(),
      Order.count({
        where: { status: OrderStatus.CONFIRMED },
      }),
      Product.count(),
      User.count({
        where: { approved: true },
      }),
      this.getTodayRevenue(today),
      this.getOrdersSummary(thirtyDaysAgo, today),
      this.getRevenueTrends(thirtyDaysAgo, today),
    ]);

    const dashboardStats = {
      totalOrders,
      pendingOrders,
      totalProducts,
      activeUsers,
      todayRevenue,
      ordersSummary,
      revenueTrends,
    };

    await this.cacheManager.set(
      this.dashboardCacheKey,
      dashboardStats,
      this.dashboardCacheTtl,
    );

    return dashboardStats;
  }

  private async getTodayRevenue(today: Date): Promise<number> {
    const result = await Order.getRepository()
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.total), 0)', 'todayRevenue')
      .where('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate: today,
        endDate: new Date(),
      })
      .getRawOne<{ todayRevenue: string }>();

    return Number(result?.todayRevenue || 0);
  }

  private async getOrdersSummary(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; count: number }>> {
    const orders = await Order.getRepository()
      .createQueryBuilder('order')
      .select("DATE(order.createdAt)", 'date')
      .addSelect('COUNT(order.id)', 'count')
      .where('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy("DATE(order.createdAt)")
      .orderBy("DATE(order.createdAt)", 'ASC')
      .getRawMany<{ date: string; count: string }>();

    return this.buildCountSeries(startDate, orders);
  }

  private async getRevenueTrends(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; revenue: number }>> {
    const orders = await Order.getRepository()
      .createQueryBuilder('order')
      .select("DATE(order.createdAt)", 'date')
      .addSelect('COALESCE(SUM(order.total), 0)', 'revenue')
      .where('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy("DATE(order.createdAt)")
      .orderBy("DATE(order.createdAt)", 'ASC')
      .getRawMany<{ date: string; revenue: string }>();

    return this.buildRevenueSeries(startDate, orders);
  }

  private buildCountSeries(
    startDate: Date,
    rows: Array<{ date: string; count: string }>,
  ): Array<{ date: string; count: number }> {
    const normalizedStartDate = new Date(startDate);
    normalizedStartDate.setHours(0, 0, 0, 0);

    const grouped = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.date] = Number(row.count || 0);
      return acc;
    }, {});

    return this.createSeries(normalizedStartDate, grouped, 'count') as Array<{
      date: string;
      count: number;
    }>;
  }

  private buildRevenueSeries(
    startDate: Date,
    rows: Array<{ date: string; revenue: string }>,
  ): Array<{ date: string; revenue: number }> {
    const normalizedStartDate = new Date(startDate);
    normalizedStartDate.setHours(0, 0, 0, 0);

    const grouped = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.date] = Number(row.revenue || 0);
      return acc;
    }, {});

    return this.createSeries(normalizedStartDate, grouped, 'revenue') as Array<{
      date: string;
      revenue: number;
    }>;
  }

  private createSeries(
    normalizedStartDate: Date,
    grouped: Record<string, number>,
    type: 'count' | 'revenue',
  ):
    | Array<{ date: string; count: number }>
    | Array<{ date: string; revenue: number }> {
    const dates: string[] = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date(normalizedStartDate);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    const result = dates.map((date) => ({
      date,
      [type === 'count' ? 'count' : 'revenue']: grouped[date] || 0,
    }));

    return result as any;
  }
}
