import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ProductStatus } from '../entities/product.entity';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description: 'State of the product. Note: ACTIVE status requires at least one variant and one media item.',
    example: 'DRAFT',
    required: false,
    enum: ProductStatus,
  })
  @IsEnum(ProductStatus)
  @IsOptional()
  state?: ProductStatus;
}
