import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsNumber } from 'class-validator';

export class ReorderProductVariantsDto {
  @ApiProperty({
    description: 'Variant IDs in the desired display order (first = top)',
    example: [12, 5, 8],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((id) => Number(id)) : value,
  )
  orderedVariantIds: number[];
}
