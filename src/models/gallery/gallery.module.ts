import { Module } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { GalleryController } from './gallery.controller';
import { UploaderModule } from 'src/providers/uploader/uploader.module';

@Module({
  imports: [UploaderModule],
  controllers: [GalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}
