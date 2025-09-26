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
    const galleries = await Gallery.find({
      take: pagination.take,
      skip: pagination.skip,
      order: {
        createdAt: 'DESC',
      },
    });
    return galleries;
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

  /**
   * One-time batch update function to convert invalid public URLs to signed URLs
   * This function processes galleries in batches to avoid memory issues
   */
  async updateImageUrlsToSignedUrls(batchSize: number = 50) {
    console.log('Starting batch update of gallery image URLs...');
    
    let offset = 0;
    let totalUpdated = 0;
    let hasMore = true;

    while (hasMore) {
      // Fetch galleries in batches
      const galleries = await Gallery.find({
        take: batchSize,
        skip: offset,
        order: { id: 'ASC' }
      });

      if (galleries.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`Processing batch ${Math.floor(offset / batchSize) + 1}: ${galleries.length} galleries`);

      // Process each gallery in the current batch
      for (const gallery of galleries) {
        try {
          // Check if the URL is a Firebase Storage public URL that needs conversion
          if (gallery.imageUrl && gallery.imageUrl.includes('storage.googleapis.com') && gallery.imageUrl.includes('tru-scapes-1858e.appspot.com')) {
            // Extract the file path from the public URL
            const urlParts = gallery.imageUrl.split('tru-scapes-1858e.appspot.com/');
            if (urlParts.length > 1) {
              const filePath = urlParts[1];
              
              // Generate signed URL
              const signedUrl = await this.uploader.getSignedUrl(filePath);
              
              // Update the gallery record
              await Gallery.update(gallery.id, { imageUrl: signedUrl });
              
              totalUpdated++;
              console.log(`Updated gallery ID ${gallery.id}: ${gallery.imageName}`);
            }
          }
        } catch (error) {
          console.error(`Error updating gallery ID ${gallery.id}:`, error.message);
        }
      }

      offset += batchSize;
      
      // Add a small delay between batches to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Batch update completed. Total galleries updated: ${totalUpdated}`);
    return {
      success: true,
      totalUpdated,
      message: `Successfully updated ${totalUpdated} gallery image URLs to signed URLs`
    };
  }
}
