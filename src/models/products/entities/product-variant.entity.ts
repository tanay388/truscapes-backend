import { BaseClassEntity } from 'src/common/entities/base.extend-entity';
import { Entity, Column, ManyToOne, JoinColumn, RelationId } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_variants')
export class ProductVariant extends BaseClassEntity {
  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  sku: string;

  @Column('simple-array')
  images: string[];

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  dealerPrice: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  price: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  distributorPrice: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  contractorPrice: number;

  @ManyToOne(() => Product, (product) => product.variants, {
    nullable: false,
    onDelete: 'CASCADE',
    // eager: true,
  })
  // @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'integer', nullable: true })
  @RelationId((productVariant: ProductVariant) => productVariant.product)
  productId: number;
}
