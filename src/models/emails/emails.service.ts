import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { AdminEmailEntity } from './entities/admin-email.entity';

@Injectable()
export class EmailsService {
  async create(createEmailDto: CreateEmailDto) {
    const adminEmail = new AdminEmailEntity();
    adminEmail.email = createEmailDto.email;
    await adminEmail.save();

    return adminEmail;
  }

  findAll() {
    return AdminEmailEntity.find();
  }

  findOne(id: number) {
    return `This action returns a #${id} email`;
  }

  update(id: number, updateEmailDto: UpdateEmailDto) {
    return `This action updates a #${id} email`;
  }

  async remove(id: number) {
    const email = await AdminEmailEntity.findOneBy({ id });

    if (!email) {
      throw new BadRequestException('Email not found');
    }
    await AdminEmailEntity.getRepository().softRemove(email);
    return email;
  }
}
