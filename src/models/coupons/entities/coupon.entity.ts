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
import { Category } from '../../category/entities/category.entity';
import { Product } from '../../products/entities/product.entity';

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  BOGO = 'BOGO',
}

export enum CouponEligibilityType {
  PUBLIC = 'PUBLIC',
  SPECIFIC_USERS = 'SPECIFIC_USERS',
  USER_ROLE = 'USER_ROLE',
}

export enum CouponScopeType {
  ENTIRE_ORDER = 'ENTIRE_ORDER',
  SPECIFIC_ITEMS = 'SPECIFIC_ITEMS',
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

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
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

  @Column({
    type: 'enum',
    enum: CouponScopeType,
    default: CouponScopeType.ENTIRE_ORDER,
  })
  scopeType: CouponScopeType;

  @ManyToMany(() => Category)
  @JoinTable()
  eligibleCategories: Category[];

  @ManyToMany(() => Product)
  @JoinTable()
  eligibleProducts: Product[];

  @Column({ default: true })
  includeSubcategories: boolean;

  @Column({ type: 'integer', nullable: true })
  bogoBuyQuantity: number;

  @Column({ type: 'integer', nullable: true })
  bogoGetQuantity: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true, default: 100 })
  bogoGetDiscountPercent: number;

  @Column({ type: 'integer', nullable: true })
  bogoMaxSetsPerOrder: number;

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
