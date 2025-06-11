import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Min } from 'class-validator';

export class UpdateWalletBalanceDto {
  @ApiProperty({ description: 'New wallet balance', example: 1000 })
  @IsNumber()
  @Min(0)
  newBalance: number;
}