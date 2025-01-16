import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class TransactionsService {
  create(createTransactionDto: CreateTransactionDto) {
    return 'This action adds a new transaction';
  }

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

    return transaction.save();
  }

  findAll() {
    return `This action returns all transactions`;
  }

  findOne(userId: string) {
    const transactions = Transaction.find({
      where: {
        user: {
          id: userId,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return transactions;
  }

  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }
}
