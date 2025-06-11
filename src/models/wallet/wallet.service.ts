import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreditWalletDto } from './dto/credit-wallet.dto';
import { RepayDuesDto, PaymentGateway } from './dto/repay-dues.dto';
import { Wallet } from './entities/wallet.entity';
import { TransactionsService } from '../transactions/transactions.service';
import {
  TransactionType,
  PaymentMethod,
} from '../transactions/entities/transaction.entity';
import { User } from '../user/entities/user.entity';
import { PaymentGatewayService } from './services/payment-gateway.service';
import { EmailService } from 'src/providers/email/email.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly emailService: EmailService,
  ) {}

  async findOne(userId: string) {
    const wallet = await Wallet.findOne({
      where: {
        user: { id: userId },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async creditWallet(
    userId: string,
    creditWalletDto: CreditWalletDto,
    adminId: string,
  ) {
    const admin = await User.findOne({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    const wallet = await this.findOne(userId);
    if (!wallet) {
      throw new NotFoundException('User wallet not found');
    }

    const { amount, description } = creditWalletDto;

    // Update wallet balance and credit due
    wallet.balance += amount;
    // wallet.creditDue += amount;
    await wallet.save();

    // Record transaction
    await this.transactionsService.addTransaction(
      TransactionType.CREDIT_ADDED,
      amount,
      description ||
        `Credit added by admin: ${admin.name || admin.email}.`,
      userId,
    );

    return {
      ...wallet,
      message: `Credit of ${amount} added successfully. This amount needs to be paid back. Total credit due: ${wallet.creditDue}`,
    };
  }

  async repayDues(userId: string, repayDuesDto: RepayDuesDto) {
    const wallet = await this.findOne(userId);
    const { amount, gateway, paymentToken, cardInfo, description } =
      repayDuesDto;

    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    if (amount > wallet.creditDue) {
      throw new BadRequestException('Payment amount cannot exceed credit due');
    }

    // Process payment through the selected gateway
    const paymentData =
      gateway === PaymentGateway.AUTHORIZE_NET ? cardInfo : paymentToken;
    const payment = await this.paymentGatewayService.processPayment(
      gateway,
      amount,
      paymentData,
      userId,
      {
        type: 'repay-dues',
      },
    );

    // For PayPal and Stripe, return the payment URL
    if (payment.requiresAction) {
      return {
        success: true,
        paymentUrl: payment.paymentUrl,
        message: 'Please complete the payment using the provided URL',
      };
    }

    // For Authorize.NET, process payment and update wallet immediately
    if (payment.success) {
      wallet.creditDue -= amount;
      await wallet.save();

      // Record transaction
      await this.transactionsService.addTransaction(
        TransactionType.CREDIT_REPAYMENT,
        amount,
        description || `Credit repayment via ${gateway}`,
        userId,
      );

      return {
        success: true,
        message: `Successfully repaid ${amount}. Remaining credit due: ${wallet.creditDue}`,
        remainingDue: wallet.creditDue,
        transactionId: payment.transactionId,
      };
    }

    throw new BadRequestException('Payment processing failed');
  }

  async verifyPayment(sessionId: string, paymentGateway: string) {
    return await this.paymentGatewayService.confirmPaymentResponse(
      sessionId,
      paymentGateway,
    );
  }

  async requestClearDue(userId: string) {
    const wallet = await this.findOne(userId);
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    wallet.creditDue = 0;
    await wallet.save();

    await this.emailService.sendPaymentRequestEmail(
      user.email,
      user.name,
      wallet.creditDue,
      'https://shop.tru-scapes.com/profile',
    );

    return { message: 'Credit due has been cleared' };
  }

  async updateWalletBalance(userId: string, newBalance: number, adminId: string) {
    const admin = await User.findOne({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    const wallet = await this.findOne(userId);
    if (!wallet) {
      throw new NotFoundException('User wallet not found');
    }

    const currentBalance = wallet.balance;
    const difference = Math.abs(newBalance - currentBalance);

    // Update wallet balance
    wallet.balance = newBalance;
    await wallet.save();

    // Create transaction record
    if (newBalance > currentBalance) {
      await this.transactionsService.addTransaction(
        TransactionType.CREDIT_ADDED,
        difference,
        `Credited by admin: ${admin.name || admin.email}`,
        userId,
      );
    } else if (newBalance < currentBalance) {
      await this.transactionsService.addTransaction(
        TransactionType.WITHDRAWAL,
        difference,
        `Debited by admin: ${admin.name || admin.email}`,
        userId,
      );
    }

    this.emailService.sendWalletBalanceUpdateEmail(
      wallet.user.email,
      wallet.user.name,
      newBalance,
    )

    return {
      ...wallet,
      message: `Wallet balance updated successfully. New balance: ${newBalance}`,
    };
  }
}
