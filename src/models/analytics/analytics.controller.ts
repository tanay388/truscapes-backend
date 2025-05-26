import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { DashboardStatsDto } from './dto/dashboard.dto';
import { AdminOnly } from '../user/decorator/admin-only.decorator';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @AdminOnly()
  @ApiOperation({ summary: 'Get dashboard statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns dashboard statistics including orders, users, and revenue data',
    type: DashboardStatsDto
  })
  getDashboardStats(): Promise<DashboardStatsDto> {
    return this.analyticsService.getDashboardStats();
  }
}