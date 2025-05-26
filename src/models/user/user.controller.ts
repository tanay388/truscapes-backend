import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  UploadedFile,
  Headers,
  UseInterceptors,
  Post,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { Response } from 'express';
import { UserService } from './user.service';
import { FirebaseSecure } from './decorator/firebase.secure.decorator';
import { FirebaseUser } from '../../providers/firebase/firebase.service';
import { FUser } from './decorator/firebase.user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Gender } from './entities/user.entity';
import { Pagination } from 'src/common/dtos/pagination.dto';
import { Public } from './decorator/public.decorator';
import { AdminOnly } from './decorator/admin-only.decorator';
import { SearchUserDto } from './dto/search-user.dto';

@FirebaseSecure()
@ApiTags('User Controller')
@Controller({
  path: 'user',
})
@ApiBearerAuth()
export class UserController {
  constructor(private userService: UserService) {}

  @Get('/')
  getProfile(
    @FUser() user: FirebaseUser,
    @Headers('notification-token') token: string | undefined,
  ) {
    return this.userService.getProfile(user, token);
  }

  @Get('users')
  @AdminOnly()
  getUsers(@Query() searchDto: SearchUserDto) {
    return this.userService.getUsers(searchDto);
  }

  @Post('users/:id/approve')
  approveSingleUser(@Param('id') id: string, @FUser() user: FirebaseUser) {
    return this.userService.approveSingleUser(id, user.uid);
  }

  @Post('admin/:id')
  makeadmin(@Param('id') id: string, @FUser() user: FirebaseUser) {
    return this.userService.makeadmin(id, user.uid);
  }

  @Post('users/:id/block')
  blockSingleUser(@Param('id') id: string, @FUser() user: FirebaseUser) {
    return this.userService.blockSingleUser(id, user.uid);
  }

  @Get(':id')
  getProfileById(@Param('id') userId: string) {
    return this.userService.getProfileById(userId);
  }

  @Patch('/')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo'))
  async updateProfile(
    @FUser() user: FirebaseUser,
    @Body() dto: UpdateUserDto,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    return this.userService.updateProfile(user, dto, photo);
  }

  @Post('firebase-token')
  updateFirebaseToken(
    @FUser() user: FirebaseUser,
    @Query('isShop') isShop: boolean,
    @Headers('notification-token') token: string | undefined,
  ) {
    return this.userService.updateFirebaseToken(user, token, isShop);
  }

  @Get('export/excel')
  @AdminOnly()
  @ApiOperation({ summary: 'Export users data as Excel file' })
  async exportUsersToExcel(@Res() res: Response) {
    const users = await this.userService.getUsers({ take: 1000, skip: 0 });
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(users.map(user => ({
      ID: user.id,
      Name: user.name,
      Email: user.email,
      Phone: user.phone,
      Role: user.role,
      Approved: user.approved ? 'Yes' : 'No',
      Country: user.country,
      City: user.city,
      Company: user.company,
      Company_Address: user.companyAddress,
      Company_Website: user.companyWebsite,
      Photo: user.photo,
      Created: user.createdAt
    })));

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=users_${Date.now().toString()}.xlsx`,
    });

    return res.send(excelBuffer);
  }

  @Delete('/')
  deleteProfile(@FUser('uid') uid: string) {
    return this.userService.deleteProfile(uid);
  }

  @Delete('/:id')
  @AdminOnly()
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  deleteUser(@Param('id') userId: string, @FUser() admin: FirebaseUser) {
    return this.userService.deleteUser(userId, admin.uid);
  }
}
