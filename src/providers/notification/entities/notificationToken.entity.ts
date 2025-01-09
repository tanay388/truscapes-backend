import { Column, Entity, ManyToOne, PrimaryColumn, RelationId } from 'typeorm';
import { BaseClassEntity } from 'src/common/entities/base.extend-entity';
import { User } from 'src/models/user/entities/user.entity';

@Entity()
export class NotificationToken extends BaseClassEntity {
  @Column()
  token: string;

  @ManyToOne(() => User, (user) => user.notificationTokens, {
    onDelete: 'CASCADE',
  })
  user: User;

  @RelationId((notificationToken: NotificationToken) => notificationToken.user)
  userId: number;

  @Column({ default: false })
  isShop: boolean;
}
