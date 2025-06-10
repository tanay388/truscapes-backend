import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

export class CreateUserByAdminDto extends UpdateUserDto {
  @ApiProperty({ description: 'Temporary password for the new user', example: 'TempPass123!' })
  @IsNotEmpty()
  @IsString()
  tempPassword: string;

  @ApiProperty({ description: 'User\'s email address', example: 'john@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;
}