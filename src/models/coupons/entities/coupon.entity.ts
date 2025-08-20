import {
  Entity,
  Column,
  BaseEntity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User, UserRole } from '../../user/entities/user.entity';

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum CouponEligibilityType {
  PUBLIC = 'PUBLIC',
  SPECIFIC_USERS = 'SPECIFIC_USERS',
  USER_ROLE = 'USER_ROLE',
}

@Entity()
export class Coupon extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CouponType,
  })
  type: CouponType;

  @Column('decimal', { precision: 10, scale: 2 })
  value: number;

  @Column({
    type: 'enum',
    enum: CouponEligibilityType,
  })
  eligibilityType: CouponEligibilityType;

  @Column('simple-array', { nullable: true })
  eligibleUserRoles: UserRole[];

  @ManyToMany(() => User)
  @JoinTable()
  eligibleUsers: User[];

  @Column({ type: 'timestamp', nullable: true })
  validFrom: Date;

  @Column({ type: 'timestamp', nullable: true })
  validUntil: Date;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ nullable: true })
  maxUsage: number;

  @Column({ nullable: true })
  maxUsagePerUser: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  minimumOrderAmount: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  maximumDiscountAmount: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  createdBy: string;
}