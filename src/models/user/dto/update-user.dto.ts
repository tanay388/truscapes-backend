import { PartialType } from '@nestjs/mapped-types';
import { SignUpUserDto } from './signup-user.dto';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender } from '../entities/user.entity';

export class UpdateUserDto {
  @ApiProperty()
  @IsOptional()
  name: string;

  @ApiProperty()
  @Type(() => Date)
  @IsOptional()
  birthDate: Date;

  @ApiProperty()
  @IsEnum(Gender)
  @IsOptional()
  gender: Gender;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone: string;
}
