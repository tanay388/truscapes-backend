import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Pagination } from 'src/common/dtos/pagination.dto';
import { ProductStatus } from '../entities/product.entity';
import { Transform } from 'class-transformer';

export class ProductSearchDto extends Pagination {
  @ApiPropertyOptional({
    description: 'Search query for product name or description',
    example: 'laptop',
    required: false,
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({
    description: 'Category ID for filtering products',
    example: '1',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  categoryId?: number;

  @ApiPropertyOptional({
    description: 'State of the product',
    example: 'DRAFT',
    required: false,
  })
  @IsEnum(ProductStatus)
  @IsOptional()
  state?: ProductStatus;
}
