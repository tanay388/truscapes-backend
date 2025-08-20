import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import { UpdateCouponDto } from './dtos/update-coupon.dto';
import { ApplyCouponDto } from './dtos/apply-coupon.dto';
import { AdminOnly } from '../user/decorator/admin-only.decorator';
import { ApiTags } from '@nestjs/swagger';
import { FirebaseSecure } from '../user/decorator/firebase.secure.decorator';
import { Pagination } from 'src/common/dtos/pagination.dto';

@Controller('coupons')
@ApiTags('Coupons Management')
@FirebaseSecure()
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('admin')
  @AdminOnly()
  async createCoupon(
    @Body() createCouponDto: CreateCouponDto,
    @Request() req: any,
  ) {
    return await this.couponsService.createCoupon(
      createCouponDto,
      req.user.uid,
    );
  }

  @Get('admin')
  @AdminOnly()
  async getAllCoupons(@Query() pagination : Pagination) {
    return await this.couponsService.getAllCoupons(pagination);
  }

  @Get('admin/:id')
  @AdminOnly()
  async getCouponById(@Param('id') id: string) {
    return await this.couponsService.getCouponById(id);
  }

  @Patch('admin/:id')
  @AdminOnly()
  async updateCoupon(
    @Param('id') id: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ) {
    return await this.couponsService.updateCoupon(id, updateCouponDto);
  }

  @Delete('admin/:id')
  @AdminOnly()
  async deleteCoupon(@Param('id') id: string) {
    await this.couponsService.deleteCoupon(id);
    return { message: 'Coupon deleted successfully' };
  }

  @Get('admin/:id/stats')
  @AdminOnly()
  async getCouponStats(@Param('id') id: string) {
    return await this.couponsService.getCouponUsageStats(id);
  }

  @Get('my-coupons')
  async getMyEligibleCoupons(@Request() req: any) {
    return await this.couponsService.getEligibleCouponsForUser(req.user.uid);
  }

  @Post('validate')
  async validateCoupon(
    @Body() applyCouponDto: ApplyCouponDto,
    @Request() req: any,
  ) {
    return await this.couponsService.validateAndApplyCoupon(
      applyCouponDto,
      req.user.uid,
    );
  }
}