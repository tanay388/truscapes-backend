import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';
import { DashboardStatsDto } from './dto/dashboard.dto';
import { OrderStatus } from '../orders/entities/order.entity';

@Injectable()
export class AnalyticsService {
  private readonly dashboardCacheTtlMs = 15 * 60 * 1000; // 15 minutes
  private dashboardInflight: Promise<DashboardStatsDto> | null = null;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly dataSource: DataSource,
  ) {}

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    const cacheKey = `analytics:dashboard:${this.formatDateKey(today)}`;

    const cached = await this.cacheManager.get<DashboardStatsDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Deduplicate concurrent cache-misses (React Strict Mode double-fetch, etc.)
    if (this.dashboardInflight) {
      return this.dashboardInflight;
    }

    this.dashboardInflight = this.computeDashboardStats(
      today,
      endOfToday,
      thirtyDaysAgo,
      cacheKey,
    ).finally(() => {
      this.dashboardInflight = null;
    });

    return this.dashboardInflight;
  }

  private async computeDashboardStats(
    today: Date,
    endOfToday: Date,
    thirtyDaysAgo: Date,
    cacheKey: string,
  ): Promise<DashboardStatsDto> {
    // Two round-trips to remote Postgres instead of seven.
    const [summaryRows, dailyRows] = await Promise.all([
      this.dataSource.query(
        `
        SELECT
          (SELECT COUNT(*)::int FROM orders WHERE "deletedAt" IS NULL) AS "totalOrders",
          (SELECT COUNT(*)::int FROM orders WHERE "deletedAt" IS NULL AND status = $1) AS "pendingOrders",
          (SELECT COUNT(*)::int FROM products WHERE "deletedAt" IS NULL) AS "totalProducts",
          (SELECT COUNT(*)::int FROM "user" WHERE "deletedAt" IS NULL AND approved = true) AS "activeUsers",
          (
            SELECT COALESCE(SUM(total), 0)::float
            FROM orders
            WHERE "deletedAt" IS NULL
              AND "createdAt" BETWEEN $2 AND $3
          ) AS "todayRevenue"
        `,
        [OrderStatus.CONFIRMED, today, endOfToday],
      ),
      this.dataSource.query(
        `
        SELECT
          TO_CHAR("createdAt"::date, 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS count,
          COALESCE(SUM(total), 0)::float AS revenue
        FROM orders
        WHERE "deletedAt" IS NULL
          AND "createdAt" BETWEEN $1 AND $2
        GROUP BY TO_CHAR("createdAt"::date, 'YYYY-MM-DD')
        ORDER BY date ASC
        `,
        [thirtyDaysAgo, endOfToday],
      ),
    ]);

    const summary = summaryRows[0] || {};
    const countByDate: Record<string, number> = {};
    const revenueByDate: Record<string, number> = {};

    for (const row of dailyRows as Array<{
      date: string;
      count: string | number;
      revenue: string | number;
    }>) {
      const key = this.formatDateKey(row.date);
      countByDate[key] = Number(row.count || 0);
      revenueByDate[key] = Number(row.revenue || 0);
    }

    const dashboardStats: DashboardStatsDto = {
      totalOrders: Number(summary.totalOrders || 0),
      pendingOrders: Number(summary.pendingOrders || 0),
      totalProducts: Number(summary.totalProducts || 0),
      activeUsers: Number(summary.activeUsers || 0),
      todayRevenue: Number(summary.todayRevenue || 0),
      ordersSummary: this.createSeries(thirtyDaysAgo, countByDate, 'count') as Array<{
        date: string;
        count: number;
      }>,
      revenueTrends: this.createSeries(
        thirtyDaysAgo,
        revenueByDate,
        'revenue',
      ) as Array<{ date: string; revenue: number }>,
    };

    await this.cacheManager.set(
      cacheKey,
      dashboardStats,
      this.dashboardCacheTtlMs,
    );

    return dashboardStats;
  }

  private formatDateKey(value: Date | string): string {
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.slice(0, 10);
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return this.formatDateKey(parsed);
    }

    return raw;
  }

  private createSeries(
    startDate: Date,
    grouped: Record<string, number>,
    type: 'count' | 'revenue',
  ):
    | Array<{ date: string; count: number }>
    | Array<{ date: string; revenue: number }> {
    const normalizedStartDate = new Date(startDate);
    normalizedStartDate.setHours(0, 0, 0, 0);

    const result = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(normalizedStartDate);
      date.setDate(date.getDate() + i);
      const key = this.formatDateKey(date);
      result.push({
        date: key,
        [type === 'count' ? 'count' : 'revenue']: grouped[key] || 0,
      });
    }

    return result as any;
  }
}
