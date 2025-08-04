import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordByAdminDto {
  @ApiProperty({
    description: 'User ID whose password needs to be reset',
    example: 'user123'
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'New password for the user',
    example: 'newSecurePassword123',
    minLength: 6
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;
}