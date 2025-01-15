// product.entity.ts
import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  RelationId,
} from 'typeorm';
import { Category } from 'src/models/category/entities/category.entity';
import { BaseClassEntity } from 'src/common/entities/base.extend-entity';
import { ProductVariant } from './product-variant.entity';

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
}

@Entity('products')
export class Product extends BaseClassEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ enum: ProductStatus, default: ProductStatus.DRAFT })
  state: ProductStatus;

  @Column({ type: 'text' })
  description: string;

  @ManyToOne(() => Category, (category) => category.products, {
    nullable: false,
    eager: true,
  })
  category: Category;

  @RelationId((product: Product) => product.category)
  categoryId: number;

  @Column({ type: 'boolean', default: true })
  stockAvailable: boolean;

  @Column({ type: 'boolean', default: false })
  hotProduct: boolean;

  @Column({ type: 'integer', default: 0 })
  index: number;

  @Column({ type: 'integer', default: 0 })
  categoryIndex: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingCost: number;

  @Column('simple-array')
  images: string[];

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  basePrice: number;

  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
    eager: true,
  })
  variants: ProductVariant[];

//   // Utility method to get variant by ID
//   getVariantById(variantId: number): ProductVariant | undefined {
//     return this.variants?.find((variant) => variant.id === variantId);
//   }
}
