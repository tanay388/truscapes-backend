import { BaseClassEntity } from 'src/common/entities/base.extend-entity';
import { User } from 'src/models/user/entities/user.entity';
import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { SavedOrderItem } from './saved-order-item.entity';

@Entity('saved_orders')
export class SavedOrder extends BaseClassEntity {
  @ManyToOne(() => User, {
    eager: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn()
  user: User;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  paymentOrder: string;

  @OneToMany(() => SavedOrderItem, (item) => item.savedOrder, {
    cascade: true,
    eager: true,
  })
  items: SavedOrderItem[];
}
