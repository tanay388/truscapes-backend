import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductStatus } from './entities/product.entity';
import { ProductSearchDto } from './dto/product-search.dto';
import { ILike } from 'typeorm';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { ProductVariant } from './entities/product-variant.entity';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ReorderProductVariantsDto } from './dto/reorder-product-variants.dto';

@Injectable()
export class ProductsService {
  private sortProductVariants<T extends Product | null>(product: T): T {
    if (product?.variants?.length) {
      product.variants.sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.id ?? 0) - (b.id ?? 0),
      );
    }
    return product;
  }

  async create(createProductDto: CreateProductDto) {
    // Ensure new products start as DRAFT since they won't have variants initially
    try {
      const product = await Product.save({
        ...createProductDto,
        state: ProductStatus.DRAFT, // Force new products to start as DRAFT
        category: { id: createProductDto.categoryId },
      });
      return product;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async addVariant(
    productId: number,
    createProductVariantDto: CreateProductVariantDto,
  ) {
    const product = await Product.findOneBy({ id: productId });
    if (!product) {
      return new NotFoundException(`Product with ID ${productId} not found`);
    }

    const nextSortOrder =
      createProductVariantDto.sortOrder ??
      (product.variants?.reduce(
        (max, variant) => Math.max(max, variant.sortOrder ?? 0),
        -1,
      ) ?? -1) + 1;

    await ProductVariant.save({
      ...createProductVariantDto,
      sortOrder: nextSortOrder,
      product: { id: productId },
      productId,
    });
    return this.sortProductVariants(await Product.findOneBy({ id: productId }));
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
    return this.sortProductVariants(
      await Product.findOneBy({ id: variant.productId }),
    );
  }

  async reorderVariants(
    productId: number,
    reorderProductVariantsDto: ReorderProductVariantsDto,
  ) {
    const product = await Product.findOneBy({ id: productId });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const existingIds = new Set(
      (product.variants || []).map((variant) => variant.id),
    );
    const { orderedVariantIds } = reorderProductVariantsDto;

    if (orderedVariantIds.length !== existingIds.size) {
      throw new BadRequestException(
        'orderedVariantIds must include every variant for this product',
      );
    }

    for (const variantId of orderedVariantIds) {
      if (!existingIds.has(variantId)) {
        throw new BadRequestException(
          `Variant ${variantId} does not belong to product ${productId}`,
        );
      }
    }

    await Promise.all(
      orderedVariantIds.map((variantId, index) =>
        ProductVariant.update(variantId, { sortOrder: index }),
      ),
    );

    return this.sortProductVariants(await Product.findOneBy({ id: productId }));
  }

  async removeVariant(variantId: number) {
    const variant = await ProductVariant.findOneBy({ id: variantId });
    if (!variant) {
      return new NotFoundException(`Variant with ID ${variantId} not found`);
    }

    const product = await Product.findOneBy({ id: variant.productId });

    if (product.variants.length === 1) {
      await Product.update(
        { id: product.id },
        {
          state: ProductStatus.DRAFT,
        },
      );
    }
    await variant.softRemove();
    return this.sortProductVariants(
      await Product.findOneBy({ id: product.id }),
    );
  }

  async findAll(search: ProductSearchDto) {
    const { q, categoryId, take, skip, state, includeOutOfStock } = search;

    let whereConditions: any = {
      ...(categoryId && { category: { id: categoryId } }),
      state: state ? state : ProductStatus.ACTIVE,
      ...(includeOutOfStock ? {} : { stockAvailable: true }),
    };

    if (q) {
      whereConditions = [
        {
          name: ILike(`%${q}%`),
          ...(categoryId && { category: { id: categoryId } }),
          state: state ? state : ProductStatus.ACTIVE,
          ...(includeOutOfStock ? {} : { stockAvailable: true }),
        },
        {
          description: ILike(`%${q}%`),
          ...(categoryId && { category: { id: categoryId } }),
          state: state ? state : ProductStatus.ACTIVE,
          ...(includeOutOfStock ? {} : { stockAvailable: true }),
        },
      ];
    }

    const products = await Product.find({
      where: whereConditions,
      order: { categoryIndex: 'ASC', index: 'ASC', createdAt: 'DESC' },
      take: take,
      skip: skip,
    });
    products.forEach((product) => this.sortProductVariants(product));
    return products;
  }

  async findOne(id: number) {
    return this.sortProductVariants(await Product.findOneBy({ id }));
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    updateProductDto.categoryId = Number(updateProductDto.categoryId);

    const product = await Product.findOne({
      where: { id },
      relations: ['variants'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check if trying to set status to ACTIVE without variants
    if (updateProductDto.state === ProductStatus.ACTIVE) {
      if (!product.variants || product.variants.length === 0) {
        throw new BadRequestException(
          'Cannot set product status to ACTIVE when no variants are available',
        );
      }
    }

    // If images are being updated and become empty, force status to DRAFT
    let finalState = updateProductDto.state;
    if (
      updateProductDto.images !== undefined &&
      (!updateProductDto.images || updateProductDto.images.length === 0)
    ) {
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
      allowCaseOrder: updateProductDto.allowCaseOrder,
      category: { id: updateProductDto.categoryId },
    });

    if (!updatedProduct.affected) {
      return new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.sortProductVariants(await Product.findOneBy({ id }));
  }

  async remove(id: number) {
    const product = await Product.findOneBy({ id });
    await product.softRemove();
    return product;
  }
}
