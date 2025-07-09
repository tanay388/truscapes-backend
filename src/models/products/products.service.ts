import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductStatus } from './entities/product.entity';
import { ProductSearchDto } from './dto/product-search.dto';
import { ILike } from 'typeorm';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { ProductVariant } from './entities/product-variant.entity';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Injectable()
export class ProductsService {
  async create(createProductDto: CreateProductDto) {
    // Ensure new products start as DRAFT since they won't have variants initially
    const product = await Product.save({
      ...createProductDto,
      state: ProductStatus.DRAFT, // Force new products to start as DRAFT
      category: { id: createProductDto.categoryId },
    });

    return product;
  }

  async addVariant(
    productId: number,
    createProductVariantDto: CreateProductVariantDto,
  ) {
    const product = await Product.findOneBy({ id: productId });
    if (!product) {
      return new NotFoundException(`Product with ID ${productId} not found`);
    }
    const variant = await ProductVariant.save({
      ...createProductVariantDto,
      product: { id: productId },
      productId,
    });
    return await Product.findOneBy({ id: productId });
  }

  async updateVariant(
    variantId: number,
    updateProductVariantDto: UpdateProductVariantDto,
  ) {
    const variant = await ProductVariant.findOneBy({ id: variantId });
    // console.log(variant);
    if (!variant) {
      return new NotFoundException(`Variant with ID ${variantId} not found`);
    }
    await ProductVariant.update(variantId, updateProductVariantDto);
    return await Product.findOneBy({ id: variant.productId });
  }

  async removeVariant(variantId: number) {
    const variant = await ProductVariant.findOneBy({ id: variantId });
    if (!variant) {
      return new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    const product = await Product.findOneBy({ id: variant.productId });

    if(product.variants.length === 1){
      await Product.update(
        {id: product.id},
        {
          state: ProductStatus.DRAFT
        }
      )
    }
    await variant.softRemove();
    return product;
  }

  async findAll(search: ProductSearchDto) {
    const { q, categoryId, take, skip, state } = search;

    return await Product.find({
      where: {
        ...(q && { name: ILike(`%${q}%`) }),
        ...(categoryId && { category: { id: categoryId } }),
        state: state ? state : ProductStatus.ACTIVE,
      },
      order: { categoryIndex: 'ASC', index: 'ASC', createdAt: 'DESC' },
      take: take,
      skip: skip,
    });
  }

  async findOne(id: number) {
    return await Product.findOneBy({ id });
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    updateProductDto.categoryId = Number(updateProductDto.categoryId);
    
    const product = await Product.findOne({ 
      where: { id }, 
      relations: ['variants'] 
    });
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    
    // Check if trying to set status to ACTIVE without variants
    if (updateProductDto.state === ProductStatus.ACTIVE) {
      if (!product.variants || product.variants.length === 0) {
        throw new BadRequestException('Cannot set product status to ACTIVE when no variants are available');
      }
    }
    
    // If images are being updated and become empty, force status to DRAFT
    let finalState = updateProductDto.state;
    if (updateProductDto.images !== undefined && (!updateProductDto.images || updateProductDto.images.length === 0)) {
      finalState = ProductStatus.DRAFT;
    }
    
    const updatedProduct = await Product.update(id, {
      name: updateProductDto.name,
      description: updateProductDto.description,
      stockAvailable: updateProductDto.stockAvailable,
      hotProduct: updateProductDto.hotProduct,
      basePrice: updateProductDto.basePrice,
      shippingCost: updateProductDto.shippingCost,
      images: updateProductDto.images,
      categoryIndex: updateProductDto.categoryIndex,
      index: updateProductDto.index,
      state: finalState,
      caseSize: updateProductDto.caseSize,
      category: { id: updateProductDto.categoryId },
    });

    if (!updatedProduct.affected) {
      return new NotFoundException(`Product with ID ${id} not found`);
    }

    return await Product.findOneBy({ id });
  }

  async remove(id: number) {
    const product = await Product.findOneBy({ id });
    await product.softRemove();
    return product;
  }
}
