import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseSecure } from '../user/decorator/firebase.secure.decorator';
import { FUser } from '../user/decorator/firebase.user.decorator';
import { FirebaseUser } from 'src/providers/firebase/firebase.service';
import { AdminOnly } from '../user/decorator/admin-only.decorator';
import { Pagination } from 'src/common/dtos/pagination.dto';

@ApiTags('Orders')
@Controller('orders')
@ApiBearerAuth()
@FirebaseSecure()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  create(@Body() createOrderDto: CreateOrderDto, @FUser() user: FirebaseUser) {
    return this.ordersService.create(createOrderDto, user.uid);
  }

  @Post(':orderId/confirm-payment')
  @ApiOperation({ summary: 'Confirm order payment' })
  confirmPayment(
    @Param('orderId', ParseIntPipe) orderId: number,
    @FUser() user: FirebaseUser,
  ) {
    return this.ordersService.confirmPayment(orderId, user.uid);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Get current user\'s orders' })
  getMyOrders(@FUser() user: FirebaseUser, @Query() pagination: Pagination) {
    return this.ordersService.findUserOrders(user.uid, pagination);
  }

  @Get()
  @AdminOnly()
  @ApiOperation({ summary: 'Get all orders (Admin only)' })
  findAll(@Query() pagination: Pagination) {
    return this.ordersService.findAll(pagination);
  }

  @Get('user/:userId')
  @AdminOnly()
  @ApiOperation({ summary: 'Get orders for a specific user (Admin only)' })
  getUserOrders(
    @Param('userId') userId: string,
    @Query() pagination: Pagination,
  ) {
    return this.ordersService.findUserOrders(userId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @FUser() user: FirebaseUser) {
    return this.ordersService.findOne(id, user.uid);
  }

  @Patch(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderDto,
    @FUser() user: FirebaseUser,
  ) {
    return this.ordersService.update(id, updateOrderDto, user.uid);
  }
}