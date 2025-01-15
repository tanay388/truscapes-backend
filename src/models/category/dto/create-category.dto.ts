import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'The name of the category',
    example: 'Electronics',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'A brief description of the category',
    example: 'Category for electronic gadgets and devices',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Parent category ID if this category is a subcategory',
    example: '110',
  })
  @IsString()
  @IsOptional()
  parentId?: number;

  @ApiPropertyOptional({
    description: 'Index of the category in the category list',
    example: '1',
  })
  @IsString()
  @IsOptional()
  index?: number;
}
