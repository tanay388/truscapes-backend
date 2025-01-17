import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @ApiProperty({ description: 'User\'s full name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'User\'s phone number', example: '+1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'User\'s email address', example: 'john@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'User\'s country', example: 'United States' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ description: 'User\'s city', example: 'New York' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ description: 'User\'s company name', example: 'Acme Corp' })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiProperty({ description: 'Company website URL', example: 'https://www.acme.com' })
  @IsString()
  @IsOptional()
  companyWebsite?: string;

  @ApiProperty({ description: 'Company address', example: '123 Business St, Suite 100' })
  @IsString()
  @IsOptional()
  companyAddress?: string;

  @ApiProperty({ description: 'User\'s birth date', example: '1990-01-01' })
  @Type(() => Date)
  @IsOptional()
  birthDate?: Date;

  @ApiProperty({
    description: 'User\'s gender',
    enum: Gender,
    example: Gender.male
  })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiProperty({
    description: 'User\'s role',
    enum: UserRole,
    example: UserRole.USER
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}