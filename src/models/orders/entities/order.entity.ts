import { BaseClassEntity } from 'src/common/entities/base.extend-entity';
import { Product } from 'src/models/products/entities/product.entity';
import { User } from 'src/models/user/entities/user.entity';
import { Coupon } from 'src/models/coupons/entities/coupon.entity';
import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { OrderItem } from './order-item.entity';
import { PaymentMethod } from 'src/models/transactions/entities/transaction.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

@Entity('orders')
export class Order extends BaseClassEntity {
  @ManyToOne(() => User, { eager: true })
  @JoinColumn()
  user: User;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column('decimal', { precision: 10, scale: 2 })
  shippingCost: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @ManyToOne(() => Coupon, { nullable: true, eager: true })
  @JoinColumn()
  appliedCoupon: Coupon;

  @Column({ nullable: true })
  couponCode: string;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column('jsonb')
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    phone: string;
  };

  @Column({ nullable: true })
  paymentIntentId: string;

  @Column({ nullable: true })
  checkoutSessionId: string;

  @Column({
    nullable: true
  })
  cardDetail: string;

  @Column({nullable:true})
  receiptUrl: string;

  @Column({ nullable: true })
  trackingNumber: string;

  @Column({ type: 'text', nullable: true })
  notes: string;  
  
  @Column({ type: 'text', nullable: true })
  paymentOrder: string;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;
}