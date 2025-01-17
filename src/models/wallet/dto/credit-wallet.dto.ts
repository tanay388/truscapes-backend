import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreditWalletDto {
  @ApiProperty({
    description: 'Amount of credit to add (needs to be paid back)',
    example: 100.00,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Description of the credit transaction',
    example: 'Credit line extended by admin',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string;
}