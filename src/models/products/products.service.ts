import { Injectable, NotFoundException } from '@nestjs/common';
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
    const product = await Product.save({
      ...createProductDto,
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
    await variant.softRemove();
    return await Product.findOneBy({ id: variant.productId });
  }

  async findAll(search: ProductSearchDto) {
    const { q, categoryId, take, skip, state } = search;

    return await Product.find({
      where: {
        ...(q && { name: ILike(`%${q}%`) }),
        ...(categoryId && { category: { id: categoryId } }),
        state: state ? state : ProductStatus.ACTIVE,
      },
      take: take,
      skip: skip,
    });
  }

  async findOne(id: number) {
    return await Product.findOneBy({ id });
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    updateProductDto.categoryId = Number(updateProductDto.categoryId);
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
      category: { id: updateProductDto.categoryId },
    });

    return updatedProduct;
  }

  async remove(id: number) {
    const product = await Product.findOneBy({ id });
    await product.softRemove();
    return product;
  }
}
