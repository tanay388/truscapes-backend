import { ApiProperty } from '@nestjs/swagger';

class OrderSummaryItem {
  @ApiProperty({
    description: 'Date of the order summary'
  })
  date: string;

  @ApiProperty({
    description: 'Number of orders for this date'
  })
  count: number;
}

class RevenueTrendItem {
  @ApiProperty({
    description: 'Date of the revenue trend'
  })
  date: string;

  @ApiProperty({
    description: 'Revenue amount for this date'
  })
  revenue: number;
}

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Total number of orders in the system'
  })
  totalOrders: number;

  @ApiProperty({
    description: 'Number of pending orders'
  })
  pendingOrders: number;

  @ApiProperty({
    description: 'Total number of products in the system'
  })
  totalProducts: number;

  @ApiProperty({
    description: 'Number of active users'
  })
  activeUsers: number;

  @ApiProperty({
    description: 'Revenue generated today'
  })
  todayRevenue: number;

  @ApiProperty({
    description: 'Daily order counts for the last 30 days',
    type: [OrderSummaryItem]
  })
  ordersSummary: OrderSummaryItem[];

  @ApiProperty({
    description: 'Daily revenue for the last 30 days',
    type: [RevenueTrendItem]
  })
  revenueTrends: RevenueTrendItem[];
}