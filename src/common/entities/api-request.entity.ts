import { Column, Entity } from 'typeorm';
import { BaseClassEntity } from './base.extend-entity';

@Entity()
export class ApiRequest extends BaseClassEntity {
  @Column()
  path: string;

  @Column()
  method: string;

  @Column()
  status: number;

  @Column({ nullable: true })
  body: string;

  @Column()
  headers: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  message: string;

  @Column({ nullable: true })
  ip: string;
}
