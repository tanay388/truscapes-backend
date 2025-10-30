import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsArray,
  IsOptional,
  IsNumber,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * DTO for creating a new product.
 * Note: New products automatically start with DRAFT status.
 * At least one media item is required.
 * Products can only be set to ACTIVE status after adding variants.
 */
export class CreateProductDto {
  @ApiProperty({ description: 'Name of the product', example: 'Cool T-Shirt' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Description of the product',
    example: 'A stylish and comfortable T-shirt made from premium materials.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Category ID for the product',
    example: 'a7e71f3d-6b89-4c84-b084-3a3e81d578b3',
  })
  @IsNumber()
  @IsNotEmpty()
  categoryId: number;

  @ApiProperty({
    description: 'Indicates if the product is in stock',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  stockAvailable?: boolean;

  @ApiProperty({
    description: 'Indicates if the product is a hot product',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  hotProduct?: boolean;

  @ApiProperty({
    description: 'Order placement of the product within the category',
    example: 1,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  categoryIndex?: number;

  @ApiProperty({
    description: 'Order placement of the product',
    example: 1,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  index?: number;

  @ApiProperty({
    description: 'Shipping cost of the product',
    example: 5.99,
  })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  shippingCost?: number;

  @ApiProperty({
    description: 'Regular Price of the product',
    example: 5.99,
  })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  basePrice?: number;

  @ApiProperty({
    description: 'Array of image URLs for the product',
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one media item must be selected' })
  @IsNotEmpty()
  images: string[];

  @ApiPropertyOptional({
    description: 'Case Size of the product',
  })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  caseSize?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  allowCaseOrder?:boolean
}
