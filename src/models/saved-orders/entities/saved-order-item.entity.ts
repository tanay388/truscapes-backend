import { BaseClassEntity } from 'src/common/entities/base.extend-entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SavedOrder } from './saved-order.entity';

@Entity('saved_order_items')
export class SavedOrderItem extends BaseClassEntity {
  @ManyToOne(() => SavedOrder, (savedOrder) => savedOrder.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  savedOrder: SavedOrder;

  @Column({ type: 'integer' })
  productId: number;

  @Column({ type: 'integer' })
  variantId: number;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'varchar', length: 20, default: 'SINGLE' })
  quantityType: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  variantName: string;

  @Column({ type: 'text', nullable: true })
  image: string;

  @Column('decimal', { precision: 10, scale: 3 })
  price: string;

  @Column({ type: 'integer', default: 12 })
  caseSize: number;

  @Column({ type: 'boolean', default: false })
  isPairProduct: boolean;
}
