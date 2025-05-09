import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { User } from '../user/entities/user.entity';
import { Pagination } from 'src/common/dtos/pagination.dto';
import { EmailService } from 'src/providers/email/email.service';
import { AdminEmailEntity } from '../emails/entities/admin-email.entity';

@Injectable()
export class TransactionsService {
  constructor(private emailService: EmailService) {}

  async addTransaction(
    type: TransactionType,
    amount: number,
    description: string,
    userId: string,
  ) {
    const user = await User.findOneBy({ id: userId });

    if (!user) {
      throw new Error('User not found');
    }

    const transaction = new Transaction();
    transaction.type = type;
    transaction.amount = amount;
    transaction.description = description;
    transaction.user = user;

    await transaction.save();

    await this.emailService.sendWalletUpdateEmail(
      user.email,
      user.name,
      amount,
    );

    return transaction;
  }

  async findAll(pagination: Pagination) {
    const { take = 10, skip = 0 } = pagination;

    return await Transaction.find({
      relations: ['user'],
      take,
      skip,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findUserTransactions(userId: string, pagination: Pagination) {
    const { take = 10, skip = 0 } = pagination;

    const user = await User.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await Transaction.find({
      where: {
        user: { id: userId },
      },
      take,
      skip,
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
