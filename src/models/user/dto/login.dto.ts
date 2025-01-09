import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  username: string;

  @ApiProperty()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  oldToken: string;
}
