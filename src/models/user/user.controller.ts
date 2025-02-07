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
} from '@nestjs/common';
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
  getUsers(@Query() pagination: Pagination) {
    return this.userService.getUsers(pagination);
  }

  @Post('users/:id/approve')
  approveSingleUser(@Param('id') id: string, @FUser() user: FirebaseUser) {
    return this.userService.approveSingleUser(id, user.uid);
  }

  @Post('admin/:id')
  makeadmin(@Param('id') id: string, @FUser() user: FirebaseUser) {
    return this.userService.approveSingleUser(id, user.uid);
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', nullable: true },
        birthDate: { type: 'string', format: 'date-time', nullable: true },
        gender: {
          type: 'string',
          enum: Object.values(Gender),
          nullable: true,
        },
        phone: { type: 'string', nullable: true },
        photo: {
          type: 'string',
          format: 'binary',
          nullable: true,
        },
      },
    },
  })
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

  @Delete('/')
  deleteProfile(@FUser('uid') uid: string) {
    return this.userService.deleteProfile(uid);
  }
}
