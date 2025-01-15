import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { UploaderService } from 'src/providers/uploader/uploader.service';
import { Gallery } from './entities/gallery.entity';
import { skip, take } from 'rxjs';
import { Pagination } from 'src/common/dtos/pagination.dto';

@Injectable()
export class GalleryService {
  constructor(private readonly uploader: UploaderService) {}

  async create(photos?: Express.Multer.File[]) {
    if (!photos || photos.length === 0) {
      return new BadRequestException('No photos provided');
    }

    const imagesPaths = await this.uploader.uploadFiles(
      photos,
      `gallery/${Date.now()}`,
    );

    var i = 0;

    for (const imagePath of imagesPaths) {
      const gallery = new Gallery();
      gallery.imageName = photos[i++].originalname;
      gallery.imageUrl = imagePath;
      await gallery.save();
    }
    return Gallery.find({
      take: 10,
      skip: 0,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findAll(pagination: Pagination) {
    return await Gallery.find({
      take: pagination.take,
      skip: pagination.skip,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} gallery`;
  }

  update(id: number, updateGalleryDto: UpdateGalleryDto) {
    return `This action updates a #${id} gallery`;
  }

  async remove(id: number) {
    const gallery = await Gallery.findOneBy({ id });
    if (!gallery) {
      throw new BadRequestException('Gallery not found');
    }
    await gallery.softRemove();
    return gallery;
  }
}
