import { Injectable } from '@nestjs/common';
import { DashboardStatsDto } from './dto/dashboard.dto';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { Between } from 'typeorm';

@Injectable()
export class AnalyticsService {
  async getDashboardStats(): Promise<DashboardStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get total orders
    const totalOrders = await Order.count();

    // Get pending orders
    const pendingOrders = await Order.count({
      where: { status: OrderStatus.PENDING }
    });

    // Get total products
    const totalProducts = await Product.count();

    // Get active users
    const activeUsers = await User.count({
      where: { approved: true }
    });

    // Get today's revenue
    const todayOrders = await Order.find({
      where: {
        createdAt: Between(today, new Date()),
      }
    });
    const todayRevenue = todayOrders.reduce((sum, order) => parseFloat(sum.toString()) + parseFloat(order.total.toString()), 0);

    // Get orders summary for last 30 days
    const ordersSummary = await this.getOrdersSummary(thirtyDaysAgo, today);

    // Get revenue trends for last 30 days
    const revenueTrends = await this.getRevenueTrends(thirtyDaysAgo, today);

    return {
      totalOrders,
      pendingOrders,
      totalProducts,
      activeUsers,
      todayRevenue,
      ordersSummary,
      revenueTrends
    };
  }

  private async getOrdersSummary(startDate: Date, endDate: Date): Promise<Array<{ date: string; count: number }>> {
    const orders = await Order.find({
      where: {
        createdAt: Between(startDate, endDate)
      },
      select: ['createdAt']
    });

    return this.groupByDate(orders, 'count') as Array<{ date: string; count: number }>;
  }

  private async getRevenueTrends(startDate: Date, endDate: Date): Promise<Array<{ date: string; revenue: number }>> {
    const orders = await Order.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      select: ['createdAt', 'total']
    });

    return this.groupByDate(orders, 'revenue') as Array<{ date: string; revenue: number }>;
  }

  private groupByDate(orders: Array<{ createdAt: Date; total?: number }>, type: 'count' | 'revenue'): Array<{ date: string; count: number }> | Array<{ date: string; revenue: number }> {
    // Generate all dates for the last 30 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates: string[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // Group orders by date
    const grouped = orders.reduce<Record<string, number>>((acc, order) => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      if (type === 'count') {
        acc[date] += 1;
      } else {
        acc[date] = parseFloat(acc[date].toString()) + parseFloat(order.total.toString());
      }
      return acc;
    }, {});

    // Ensure all dates are present with at least 0 value
    const result = dates.map(date => ({
      date,
      [type === 'count' ? 'count' : 'revenue']: grouped[date] || 0
    }));

    return result as any;
  }
}