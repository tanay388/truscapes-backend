import { ApiProperty } from '@nestjs/swagger';

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
    type: [{
      date: String,
      count: Number
    }]
  })
  ordersSummary: Array<{
    date: string;
    count: number;
  }>;

  @ApiProperty({
    description: 'Daily revenue for the last 30 days',
    type: [{
      date: String,
      revenue: Number
    }]
  })
  revenueTrends: Array<{
    date: string;
    revenue: number;
  }>;
}