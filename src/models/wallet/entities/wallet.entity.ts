import { BaseClassEntity } from 'src/common/entities/base.extend-entity';
import { User } from 'src/models/user/entities/user.entity';
import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';

@Entity()
export class Wallet extends BaseClassEntity {
  @OneToOne(() => User, (user) => user.wallet, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ type: 'float', default: 0 })
  balance: number;

  @Column({ type: 'float', default: 0 })
  creditDue: number;
}
