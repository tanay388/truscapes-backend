import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { CreditWalletDto } from './dto/credit-wallet.dto';
import { RepayDuesDto } from './dto/repay-dues.dto';
import { AdminOnly } from '../user/decorator/admin-only.decorator';
import { FUser } from '../user/decorator/firebase.user.decorator';
import { FirebaseUser } from 'src/providers/firebase/firebase.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FirebaseSecure } from '../user/decorator/firebase.secure.decorator';

@ApiTags('Wallet')
@Controller('wallet')
@ApiBearerAuth()
@FirebaseSecure()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('repay-dues')
  @ApiOperation({
    summary: 'Repay credit dues using a payment gateway',
    description:
      'Process payment to repay credit dues using PayPal, Authorize.net, or Stripe',
  })
  repayDues(@FUser() user: FirebaseUser, @Body() repayDuesDto: RepayDuesDto) {
    return this.walletService.repayDues(user.uid, repayDuesDto);
  }

  @Post(':userId/credit')
  @AdminOnly()
  @ApiOperation({
    summary: 'Add credit to wallet (Admin only)',
    description:
      'Adds credit to user wallet that needs to be paid back. Updates both balance and credit due.',
  })
  creditWallet(
    @Param('userId') userId: string,
    @Body() creditWalletDto: CreditWalletDto,
    @FUser() admin: FirebaseUser,
  ) {
    return this.walletService.creditWallet(userId, creditWalletDto, admin.uid);
  }

  @Post(':userId/request-clear-due')
  @AdminOnly()
  @ApiOperation({
    summary: 'Repay due from wallet (Admin only)',
    description:
      'Repays due from user wallet. Updates both balance and credit due.',
  })
  requestClearDue(@Param('userId') userId: string) {
    return this.walletService.requestClearDue(userId);
  }

  @Get(':userId')
  findOne(@Param('userId') userId: string) {
    return this.walletService.findOne(userId);
  }

  @Patch('verify-payment/:transactionId/:paymentGateway')
  verifyPayment(
    @Param('transactionId') transactionId: string,
    @Param('paymentGateway') paymentGateway: string,
  ) {
    return this.walletService.verifyPayment(transactionId, paymentGateway);
  }
}