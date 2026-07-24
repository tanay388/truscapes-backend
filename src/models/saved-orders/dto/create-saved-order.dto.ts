import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SavedOrderItemDto {
  @ApiProperty()
  @IsNumber()
  productId: number;

  @ApiProperty()
  @IsNumber()
  variantId: number;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 'SINGLE' })
  @IsString()
  @IsNotEmpty()
  quantityType: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  variantName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  price: string;

  @ApiProperty()
  @IsNumber()
  caseSize: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPairProduct?: boolean;
}

export class CreateSavedOrderDto {
  @ApiProperty({ example: 'Job Site A - Lighting' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: [SavedOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SavedOrderItemDto)
  items: SavedOrderItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Purchase Order number' })
  @IsOptional()
  @IsString()
  paymentOrder?: string;
}
