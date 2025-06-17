import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';
import { FirebaseService, FirebaseUser } from '../../providers/firebase/firebase.service';
import { UploaderService } from '../../providers/uploader/uploader.service';
import { NotificationService } from 'src/providers/notification/notification.service';
import { Wallet } from '../wallet/entities/wallet.entity';
import { EmailService } from 'src/providers/email/email.service';
import { AdminEmailEntity } from '../emails/entities/admin-email.entity';
import { Like } from 'typeorm';
import { SearchUserDto } from './dto/search-user.dto';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';

@Injectable()
export class UserService {
  constructor(
    private uploader: UploaderService,
    private notificationService: NotificationService,
    private emailService: EmailService,
    private firebaseService: FirebaseService,
  ) {}

  async deleteUser(userId: string, adminId: string) {
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Delete user from Firebase
      await this.firebaseService.auth.deleteUser(userId);

      // Update user data in database with dummy values
      await User.update(userId, {
        name: 'Deleted User',
        email: `${userId}@deleteduser.com`,
        phone: 'Deleted',
        company: 'Deleted Company',
        companyAddress: 'Deleted Address',
        companyWebsite: 'Deleted Website',
        city: 'Deleted',
        country: 'Deleted',
        photo: null,
        approved: false,
        deletedAt: new Date()
      });

      return { message: 'User deleted successfully' };
    } catch (error) {
      throw new BadRequestException(`Failed to delete user: ${error.message}`);
    }
  }

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

    return {
      ...user,
      name: `${user.name}'s ${user.companyAddress}`
    };
  }

  async getUsers(searchDto: SearchUserDto) {
    const query = searchDto.query ? `%${searchDto.query}%` : null;
    const whereConditions: any = {};
    
    if (searchDto.role) {
      whereConditions.role = searchDto.role;
    }
    
    if (searchDto.approved) {
      if (searchDto.approved === 'true') {
        whereConditions.approved = true;
      } else if (searchDto.approved === 'false') {
        whereConditions.approved = false;
      }
    }
    
    const users = await User.find({
      where: query
        ? [
            { ...whereConditions, name: Like(query) },
            { ...whereConditions, email: Like(query) }
          ]
        : whereConditions,
      take: searchDto.take,
      skip: searchDto.skip,
      order: {
        createdAt: 'DESC',
      },
    });

    return users.map(user => ({
      ...user,
      name: `${user.name}'s ${user.companyAddress}`
    }));
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
      street,
      country,
      city,
      company,
      companyAddress,
      companyWebsite,
      role,
      zip,
      additionalDetails,
      billingAddress,
      billingCity,
      billingState,
      billingZipCode,
      lastName,
      ein,
      salesRep,
    }: UpdateUserDto,
    photo?: Express.Multer.File,
    resaleFile?: Express.Multer.File,
  ) {
    const { uid, email } = fUser;

    let path: string;
    if (photo) {
      path = await this.uploader.uploadFile(photo, 'users/' + uid);
    }

    let taxExemptFormLink: string;

    if(resaleFile) {
      taxExemptFormLink = await this.uploader.uploadFile(resaleFile, 'users/' + uid + '/resale');
    }

    console.log({
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
      role,
      zip,
      additionalDetails,
      lastName,
      billingAddress,
      billingCity,
      billingState,
      billingZipCode,
      street,
      salesRep,
      ein,
      taxExemptFormLink
    })

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
      role,
      zip,
      additionalDetails,
      lastName,
      billingAddress,
      billingCity,
      billingState,
      billingZipCode,
      street,
      ein,
      salesRep,
      taxExemptFormLink: taxExemptFormLink
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

  async createUserByAdmin(dto: CreateUserByAdminDto, adminId: string) {
    // Check if user exists in our database
    let existingUser = await User.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists in database');
    }

    try {
      // Check if user exists in Firebase
      let firebaseUser;
      try {
        firebaseUser = await this.firebaseService.auth.getUserByEmail(dto.email);
      } catch (error) {
        // User doesn't exist in Firebase, create new user
        firebaseUser = await this.firebaseService.auth.createUser({
          email: dto.email,
          password: dto.tempPassword,
        });
      }

      // Create user in our database
      const user = await User.save({
        id: firebaseUser.uid,
        email: dto.email,
        name: dto.name,
        lastName: dto.lastName,
        phone: dto.phone,
        country: dto.country,
        city: dto.city,
        company: dto.company,
        zip: dto.zip,
        additionalDetails: dto.additionalDetails,
        companyWebsite: dto.companyWebsite,
        companyAddress: dto.companyAddress,
        birthDate: dto.birthDate,
        gender: dto.gender,
        role: dto.role || UserRole.USER,
        approved: true, // Auto-approve users created by admin
        billingAddress: dto.billingAddress,
        billingCity: dto.billingCity,
        billingState: dto.billingState,
        billingZipCode: dto.billingZipCode,
        street: dto.street,
      });

      // Send welcome email with temporary password
      await this.emailService.sendAccountApprovedEmail(user.email, user.name || user.email);

      return user;
    } catch (error) {
      throw new BadRequestException(`Failed to create user: ${error.message}`);
    }
  }

  async updateUserByAdmin(userId: string, dto: UpdateUserDto, photo: Express.Multer.File, adminId: string) {
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Handle photo upload if provided
    if (photo) {
      const photoUrl = await this.uploader.uploadFile(photo);
      user.photo = photoUrl;
    }

    // Update user fields
    Object.assign(user, dto);
    await user.save();

    return user;
  }
}
