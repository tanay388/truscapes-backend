import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { slugify } from 'src/common/utils/slugify';
import { UploaderService } from 'src/providers/uploader/uploader.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private uploader: UploaderService,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    image: Express.Multer.File,
    uid: string,
  ) {
    const { name, description, parentId, index } = createCategoryDto;

    // Handle slug generation and uniqueness
    const baseSlug = slugify(name);
    const uniqueSlug = await this.ensureUniqueSlug(baseSlug);

    // Find parent category if provided
    const parent = parentId
      ? await this.categoryRepository.findOneBy({ id: parentId })
      : null;

    // Save image file path if provided
    let imagePath: string;
    if (image) {
      imagePath = await this.uploader.uploadFile(
        image,
        'category/' + uniqueSlug,
      );
    }

    // Create and save the new category
    const category = this.categoryRepository.create({
      name,
      slug: uniqueSlug,
      description,
      image: imagePath,
      parent,
      index,
    });

    await this.categoryRepository.save(category);

    return category;
  }

  async findAll() {
    return await this.categoryRepository.find({
      relations: ['parent', 'children'],
      order: {
        index: 'ASC',
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: number) {
    const category = await this.categoryRepository.findOne({
      where: { id: id },
      relations: ['parent', 'children'],
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
    image: Express.Multer.File,
    uid: string,
  ) {
    const category = await this.categoryRepository.findOne({
      where: { id: id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const { name, description, parentId, index } = updateCategoryDto;

    // Update fields
    if (name) {
      category.name = name;
    }
    if (description) category.description = description;

    if (parentId) {
      category.parent = await this.categoryRepository.findOne({
        where: { id: parentId },
      });
    }

    if (index !== undefined && index !== null) {
      category.index = index;
    }

    let imagePath: string;

    if (image) {
      imagePath = await this.uploader.uploadFile(
        image,
        'category/' + category.slug,
      );
      category.image = imagePath;
    }

    await this.categoryRepository.save(category);

    return category;
  }

  async remove(id: number, uid: string) {
    const category = await this.categoryRepository.findOne({
      where: { id: id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    await this.categoryRepository.softRemove(category);
    return { message: `Category with ID ${id} successfully deleted` };
  }

  private async ensureUniqueSlug(
    baseSlug: string,
    idToExclude?: number,
  ): Promise<string> {
    let slug = baseSlug;
    let count = 0;

    while (true) {
      const query = this.categoryRepository
        .createQueryBuilder('category')
        .where('slug = :slug', { slug });

      if (idToExclude) {
        query.andWhere('id != :id', { id: idToExclude });
      }

      const existingCategory = await query.getOne();
      if (!existingCategory) break;

      count++;
      slug = `${baseSlug}-${count}`;
    }

    return slug;
  }
}
