import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Gender } from '../entities/user.entity';

export class SignUpUserDto {
  @ApiProperty()
  @IsOptional()
  name: string;

  @ApiProperty()
  @IsOptional()
  phone: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @Type(() => Date)
  @IsOptional()
  birthDate: Date;

  @ApiProperty()
  @IsEnum(Gender)
  @IsOptional()
  gender: Gender;

  @ApiProperty()
  @IsEnum(['user', 'shop'])
  from: 'user' | 'shop';

  @ApiProperty()
  @IsOptional()
  @IsString()
  oldToken?: string;
}
