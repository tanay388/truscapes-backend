import { BaseClassEntity } from 'src/common/entities/base.extend-entity';
import { Entity, Column } from 'typeorm';

@Entity()
export class AdminEmailEntity extends BaseClassEntity {
  @Column()
  email: string;
}
