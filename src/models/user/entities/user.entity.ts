import { JwtService } from '@nestjs/jwt';
import {
  Entity,
  Column,
  BaseEntity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { NotificationToken } from 'src/providers/notification/entities/notificationToken.entity';
import { Wallet } from 'src/models/wallet/entities/wallet.entity';
import { Transaction } from 'src/models/transactions/entities/transaction.entity';

export enum UserRole {
  CONTRACTOR = 'CONTRACTOR',
  DEALER = 'DEALER',
  DISTRIBUTOR = 'DISTRIBUTOR',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum Gender {
  male = 'Male',
  female = 'Female',
  preferNotToSay = 'Prefer not to say',
}

@Entity()
export class User extends BaseEntity {
  static from(partial: Partial<User>): User {
    const user = new User();
    Object.assign(user, partial);
    return user;
  }

  @PrimaryColumn()
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updateAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  photo: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  approved: boolean;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  companyWebsite: string;

  @Column({ nullable: true })
  companyAddress: string;

  @Column({ nullable: true })
  birthDate: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender;

  @Exclude()
  @Column({
    type: 'enum',
    enum: ['user', 'admin'],
    default: 'user',
  })
  role: UserRole;

  @OneToMany(() => NotificationToken, (nt) => nt.user, { onDelete: 'CASCADE' })
  notificationTokens: NotificationToken[];

  @OneToOne(() => Wallet, (wallet) => wallet.user, {
    cascade: true,
    eager: true,
  })
  @JoinColumn()
  wallet: Wallet;

  @OneToMany(() => Transaction, (t) => t.user, { cascade: true, eager: true })
  transactions: Transaction[];

  toReturnJson() {
    const { id, name, email, phone, photo, role, birthDate } = this;

    return { id, name, email, phone, photo, role, birthDate };
  }

  withJWT(jwtService: JwtService) {
    return {
      ...this,
      token: jwtService.sign({
        id: this.id,
        email: this.email,
        role: this.role,
      }),
    };
  }
}
