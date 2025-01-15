import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { Category } from './entities/category.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploaderModule } from 'src/providers/uploader/uploader.module';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), UploaderModule],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
