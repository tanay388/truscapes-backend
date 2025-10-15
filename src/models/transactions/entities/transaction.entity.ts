import { BaseClassEntity } from 'src/common/entities/base.extend-entity';
import { User } from 'src/models/user/entities/user.entity';
import {
  Entity,
  Column,
  ManyToOne,
} from 'typeorm';

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  CREDIT_ADDED = 'CREDIT_ADDED',
  CREDIT_REPAYMENT = 'CREDIT_REPAYMENT'
}

export enum PaymentMethod {
  PAYPAL = 'PAYPAL',
  AUTHORIZE_NET = 'AUTHORIZE_NET',
  STRIPE = 'STRIPE',
  ADMIN = 'ADMIN'
}

@Entity()
export class Transaction extends BaseClassEntity {
  @ManyToOne(() => User, (user) => user.transactions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: User;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ type: 'float' })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true
  })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  paymentTransactionId: string;
}