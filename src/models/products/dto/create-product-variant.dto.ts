import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsUUID,
} from 'class-validator';

export class CreateProductVariantDto {
  @ApiProperty({
    description: 'Name of the product variant',
    example: 'Large',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Array of image URLs for the variant',
    example: [
      'https://example.com/image1.png',
      'https://example.com/image2.png',
    ],
  })
  @IsArray()
  @IsNotEmpty()
  images: string[];

  @ApiProperty({
    description: 'Dealer price for the product variant',
    example: 49.99,
  })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  dealerPrice: number;

  @ApiProperty({
    description: 'Regular price for the product variant',
    example: 59.99,
  })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  price: number;

  @ApiProperty({
    description: 'Distributor price for the product variant',
    example: 45.99,
  })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  distributorPrice: number;

  @ApiProperty({
    description: 'Contractor price for the product variant',
    example: 42.99,
  })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  contractorPrice: number;

  @ApiProperty({
    description: 'ID of the associated product',
    example: '21',
  })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  productId: number;
}
