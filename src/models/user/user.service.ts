import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';
import { FirebaseUser } from '../../providers/firebase/firebase.service';
import { UploaderService } from '../../providers/uploader/uploader.service';
import { NotificationService } from 'src/providers/notification/notification.service';
import { Pagination } from 'src/common/dtos/pagination.dto';
import { Wallet } from '../wallet/entities/wallet.entity';
import { EmailService } from 'src/providers/email/email.service';
import { AdminEmailEntity } from '../emails/entities/admin-email.entity';

@Injectable()
export class UserService {
  constructor(
    // private analyticsService: AnalyticsService,
    private uploader: UploaderService,
    private notificationService: NotificationService,
    private emailService: EmailService,
  ) {}

  updateToken(uid: string, token: string) {
    return this.notificationService.updateToken(uid, token);
  }

  async getProfile(fUser: FirebaseUser, token?: string) {
    const user = await User.findOne({
      where: { id: fUser.uid },
    });

    if (!user) return this.createUserProfile(fUser);

    if (token) this.updateToken(fUser.uid, token);

    // this.analyticsService.addAnalytics(user, AnalyticsType.login);

    return user;
  }

  async getUsers(pagination: Pagination) {
    const users = await User.find({
      take: pagination.take,
      skip: pagination.skip,
      order: {
        createdAt: 'DESC',
      },
    });

    return users;
  }

  async approveSingleUser(userId: string, adminId: string) {
    const user = await User.findOne({ where: { id: userId } });
    user.approved = true;
    await user.save();

    await this.emailService.sendAccountApprovedEmail(
      user.email,
      user.name || user.email,
    );

    return user;
  }

  async makeadmin(userId: string, adminId: string) {
    const user = await User.findOne({ where: { id: userId } });
    user.role = UserRole.ADMIN;
    await user.save();
    return user;
  }

  async blockSingleUser(userId: string, adminId: string) {
    const user = await User.findOne({ where: { id: userId } });
    user.approved = false;
    await user.save();

    return user;
  }

  async getProfileById(uid: string) {
    const user = await User.findOne({
      where: { id: uid },
      // relations: ['owen', 'worksIn'],
    });
    return user;
  }

  async createUserProfile(fUser: FirebaseUser) {
    const { uid, email, phone_number, picture } = fUser;

    await User.save({
      id: uid,
      email,
      phone: phone_number,
      photo: picture,
    });

    const wallet = await Wallet.save({
      user: { id: uid },
    });

    const user = await User.update(uid, {
      wallet: { id: wallet.id },
    });

    await this.emailService.sendAccountPendingEmail(
      fUser.email,
      fUser.name || fUser.email,
    );
    const emails = await AdminEmailEntity.find();

    this.emailService.loadadminEmails(emails.map((email) => email.email));

    await this.emailService.sendNewAccountNotificationToAdmin(fUser);

    return this.getProfile(fUser);
  }

  async updateProfile(
    fUser: FirebaseUser,
    {
      name,
      gender,
      birthDate,
      phone,
      country,
      city,
      company,
      companyAddress,
      companyWebsite,
    }: UpdateUserDto,
    photo?: Express.Multer.File,
  ) {
    const { uid, email } = fUser;

    let path: string;
    if (photo) {
      path = await this.uploader.uploadFile(photo, 'users/' + uid);
    }

    await User.update(uid, {
      photo: path,
      name,
      gender,
      birthDate,
      email,
      phone,
      company,
      city,
      country,
      companyAddress,
      companyWebsite,
    });

    return this.getProfile(fUser);
  }

  async deleteProfile(uid: string) {
    await User.getRepository().softRemove({ id: uid });
  }

  async updateFirebaseToken(
    user: FirebaseUser,
    token: string,
    isShop?: boolean,
  ) {
    await this.notificationService.updateToken(user.uid, token, isShop);
    return { done: true };
  }
}
