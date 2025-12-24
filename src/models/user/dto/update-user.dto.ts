import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiPropertyOptional({description: 'User\'s lastName', example: 'Doe'})
  @IsOptional()
  @IsString()
  lastName?: string;
  

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

  @ApiPropertyOptional({description: 'User\'s zip code', example: '12345'})
  @IsString()
  @IsOptional()
  zip?: string;

  @ApiPropertyOptional({description: 'User\'s additional details', example: 'Some details'})
  @IsString()
  @IsOptional()
  additionalDetails?: string;

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

  @ApiPropertyOptional({ description: 'User\'s shipping address', example: '123 Billing St' })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({ description: 'User\'s billing address', example: '123 Billing St' })
  @IsString()
  @IsOptional()
  billingAddress?: string;

  @ApiPropertyOptional({ description: 'User\'s billing city', example: 'Billing City' })
  @IsString()
  @IsOptional()
  billingCity?: string;

  @ApiPropertyOptional({ description: 'User\'s billing state', example: 'Billing State' })
  @IsString()
  @IsOptional()
  billingState?: string;

  @ApiPropertyOptional({ description: 'User\'s billing zip code', example: '12345' })
  @IsString()
  @IsOptional()
  billingZipCode?: string;

  @ApiPropertyOptional({ description: 'User\'s sales rep', example: 'Sales Rep' })
  @IsString()
  @IsOptional()
  salesRep?: string;

  @ApiPropertyOptional({ description: 'User\'s EIN', example: '123456789' })
  @IsString()
  @IsOptional()
  ein?: string;

  @ApiPropertyOptional({ description: 'User\'s allow credit', example: true })
  @IsBoolean()
  @IsOptional()
  allowCredit?: boolean;
}