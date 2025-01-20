import { BaseClassEntity } from 'src/common/entities/base.extend-entity';
import { Product } from 'src/models/products/entities/product.entity';
import { ProductVariant } from 'src/models/products/entities/product-variant.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem extends BaseClassEntity {
  @ManyToOne(() => Order, order => order.items)
  @JoinColumn()
  order: Order;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn()
  product: Product;

  @ManyToOne(() => ProductVariant, { eager: true, nullable: true })
  @JoinColumn()
  variant: ProductVariant;

  @Column()
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;
}