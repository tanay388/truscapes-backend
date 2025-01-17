import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminOnly } from '../user/decorator/admin-only.decorator';
import { FUser } from '../user/decorator/firebase.user.decorator';
import { FirebaseUser } from 'src/providers/firebase/firebase.service';
import { FirebaseSecure } from '../user/decorator/firebase.secure.decorator';
import { Pagination } from 'src/common/dtos/pagination.dto';

@ApiTags('Transactions')
@Controller('transactions')
@ApiBearerAuth()
@FirebaseSecure()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('my-transactions')
  @ApiOperation({ summary: 'Get current user\'s transactions' })
  getMyTransactions(
    @FUser() user: FirebaseUser,
    @Query() pagination: Pagination,
  ) {
    return this.transactionsService.findUserTransactions(user.uid, pagination);
  }

  @Get('user/:userId')
  @AdminOnly()
  @ApiOperation({ summary: 'Get transactions for a specific user (Admin only)' })
  getUserTransactions(
    @Param('userId') userId: string,
    @Query() pagination: Pagination,
  ) {
    return this.transactionsService.findUserTransactions(userId, pagination);
  }

  @Get()
  @AdminOnly()
  @ApiOperation({ summary: 'Get all transactions (Admin only)' })
  findAll(@Query() pagination: Pagination) {
    return this.transactionsService.findAll(pagination);
  }
}