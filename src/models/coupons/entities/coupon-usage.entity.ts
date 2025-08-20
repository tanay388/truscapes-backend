import {
  Entity,
  Column,
  BaseEntity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Coupon } from './coupon.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity()
export class CouponUsage extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  usedAt: Date;

  @ManyToOne(() => Coupon, { eager: true })
  @JoinColumn()
  coupon: Coupon;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn()
  user: User;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn()
  order: Order;

  @Column('decimal', { precision: 10, scale: 2 })
  discountAmount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  orderAmount: number;
}