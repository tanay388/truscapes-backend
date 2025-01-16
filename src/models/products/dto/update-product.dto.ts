import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ProductStatus } from '../entities/product.entity';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description: 'State of the product',
    example: 'DRAFT',
    required: false,
  })
  @IsEnum(ProductStatus)
  @IsOptional()
  state?: ProductStatus;
}
