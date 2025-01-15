import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class CreateGalleryDto {
  @ApiProperty({
    description: 'Array of images to be uploaded',
    type: 'array',
    items: { type: 'string', format: 'binary' },
  })
  // @IsArray()
  images: any[]; // The files will be handled as binary data
}
