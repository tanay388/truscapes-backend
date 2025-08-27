import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  Query,
} from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Pagination } from 'src/common/dtos/pagination.dto';

@Controller('gallery')
@ApiTags('Gallery')
@ApiBearerAuth()
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }]))
  create(
    @Body() createGalleryDto: CreateGalleryDto,
    @UploadedFiles()
    {
      images,
    }: {
      images: Express.Multer.File[];
    },
  ) {
    return this.galleryService.create(images);
  }

  @Get()
  findAll(@Query() pagination: Pagination) {
    return this.galleryService.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.galleryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGalleryDto: UpdateGalleryDto) {
    return this.galleryService.update(+id, updateGalleryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.galleryService.remove(+id);
  }

}
