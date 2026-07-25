import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductStatus } from './entities/product.entity';
import { ProductSearchDto } from './dto/product-search.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { ProductVariant } from './entities/product-variant.entity';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ReorderProductVariantsDto } from './dto/reorder-product-variants.dto';

export type HomePreviewVariant = {
  id: number;
  price?: string;
  dealerPrice?: string;
  distributorPrice?: string;
  contractorPrice?: string;
};

export type HomePreviewProduct = {
  id: number;
  name: string;
  images: string[];
  categoryId: number;
  variants: HomePreviewVariant[];
};

export type HomePreviewSection = {
  categoryId: number;
  categoryName: string;
  categoryIndex: number;
  products: HomePreviewProduct[];
};

@Injectable()
export class ProductsService {
  private readonly homePreviewCacheKey = 'products:home-preview:v1';
  private readonly homePreviewCacheTtlMs = 10 * 60 * 1000; // 10 minutes
  private readonly listCacheTtlMs = 2 * 60 * 1000; // 2 minutes
  private readonly detailCacheTtlMs = 2 * 60 * 1000; // 2 minutes
  /** Bumped on writes so list/detail cache keys naturally miss without wildcard deletes */
  private productReadCacheGen = 1;
  private homePreviewInflight: Promise<{ sections: HomePreviewSection[] }> | null =
    null;
  private listInflight = new Map<string, Promise<any[]>>();
  private detailInflight = new Map<string, Promise<any>>();

  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private sortProductVariants<T extends Product | null>(product: T): T {
    if (product?.variants?.length) {
      product.variants.sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.id ?? 0) - (b.id ?? 0),
      );
    }
    return product;
  }

  private parseImages(images: string | string[] | null | undefined): string[] {
    if (Array.isArray(images)) return images.filter(Boolean);
    if (!images) return [];
    return String(images)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private async invalidateProductReadCaches() {
    this.productReadCacheGen += 1;
    await this.cacheManager.del(this.homePreviewCacheKey);
  }

  /** Remove pricing fields for unauthenticated responses (does not mutate cache). */
  private omitPricesFromHomePreview(payload: {
    sections: HomePreviewSection[];
  }): { sections: HomePreviewSection[] } {
    return {
      sections: payload.sections.map((section) => ({
        ...section,
        products: section.products.map((product) => ({
          ...product,
          variants: product.variants.map((variant) => ({ id: variant.id })),
        })),
      })),
    };
  }

  /**
   * Single payload for homepage category shelves (replaces N× /products calls).
   * Prices are only included when the caller is authenticated.
   */
  async getHomePreview(
    takePerCategory = 8,
    includePrices = false,
  ): Promise<{
    sections: HomePreviewSection[];
  }> {
    const take = Math.min(Math.max(takePerCategory || 8, 1), 24);

    const cached = await this.cacheManager.get<{ sections: HomePreviewSection[] }>(
      this.homePreviewCacheKey,
    );
    if (cached) {
      return includePrices ? cached : this.omitPricesFromHomePreview(cached);
    }

    if (this.homePreviewInflight) {
      const payload = await this.homePreviewInflight;
      return includePrices ? payload : this.omitPricesFromHomePreview(payload);
    }

    this.homePreviewInflight = this.computeHomePreview(take)
      .then(async (payload) => {
        await this.cacheManager.set(
          this.homePreviewCacheKey,
          payload,
          this.homePreviewCacheTtlMs,
        );
        return payload;
      })
      .finally(() => {
        this.homePreviewInflight = null;
      });

    const payload = await this.homePreviewInflight;
    return includePrices ? payload : this.omitPricesFromHomePreview(payload);
  }

  private async computeHomePreview(takePerCategory: number): Promise<{
    sections: HomePreviewSection[];
  }> {
    const categories: Array<{ id: number; name: string; index: number }> =
      await this.dataSource.query(
        `
        SELECT id, name, index
        FROM category
        WHERE "deletedAt" IS NULL
        ORDER BY index ASC, "createdAt" DESC
        `,
      );

    if (!categories.length) {
      return { sections: [] };
    }

    const productRows: Array<{
      id: number;
      name: string;
      images: string;
      categoryId: number;
    }> = await this.dataSource.query(
      `
      WITH ranked AS (
        SELECT
          p.id,
          p.name,
          p.images,
          p."categoryId" AS "categoryId",
          ROW_NUMBER() OVER (
            PARTITION BY p."categoryId"
            ORDER BY p."categoryIndex" ASC, p.index ASC, p."createdAt" DESC
          ) AS rn
        FROM products p
        WHERE p.state = $1
          AND p."stockAvailable" = true
          AND p."deletedAt" IS NULL
      )
      SELECT id, name, images, "categoryId"
      FROM ranked
      WHERE rn <= $2
      `,
      [ProductStatus.ACTIVE, takePerCategory],
    );

    const productIds = productRows.map((row) => Number(row.id));
    const variantByProductId = new Map<
      number,
      {
        id: number;
        price: string;
        dealerPrice: string;
        distributorPrice: string;
        contractorPrice: string;
      }
    >();

    if (productIds.length) {
      const variantRows: Array<{
        id: number;
        productId: number;
        price: string;
        dealerPrice: string;
        distributorPrice: string;
        contractorPrice: string;
      }> = await this.dataSource.query(
        `
        SELECT DISTINCT ON (v."productId")
          v.id,
          v."productId" AS "productId",
          v.price::text AS price,
          v."dealerPrice"::text AS "dealerPrice",
          v."distributorPrice"::text AS "distributorPrice",
          v."contractorPrice"::text AS "contractorPrice"
        FROM product_variants v
        WHERE v."productId" = ANY($1::int[])
          AND v."deletedAt" IS NULL
        ORDER BY v."productId", v."sortOrder" ASC, v.id ASC
        `,
        [productIds],
      );

      for (const variant of variantRows) {
        variantByProductId.set(Number(variant.productId), {
          id: Number(variant.id),
          price: variant.price,
          dealerPrice: variant.dealerPrice,
          distributorPrice: variant.distributorPrice,
          contractorPrice: variant.contractorPrice,
        });
      }
    }

    const productsByCategory = new Map<number, HomePreviewProduct[]>();
    for (const row of productRows) {
      const categoryId = Number(row.categoryId);
      const variant = variantByProductId.get(Number(row.id));
      // ProductCard expects variants[0]; skip products with no sellable variant
      if (!variant) continue;
      const product: HomePreviewProduct = {
        id: Number(row.id),
        name: row.name,
        images: this.parseImages(row.images),
        categoryId,
        variants: [variant],
      };
      const list = productsByCategory.get(categoryId) || [];
      list.push(product);
      productsByCategory.set(categoryId, list);
    }

    const sections = categories
      .map((category) => ({
        categoryId: Number(category.id),
        categoryName: category.name,
        categoryIndex: Number(category.index || 0),
        products: productsByCategory.get(Number(category.id)) || [],
      }))
      .filter((section) => section.products.length > 0);

    return { sections };
  }

  async create(createProductDto: CreateProductDto) {
    try {
      const product = await Product.save({
        ...createProductDto,
        state: ProductStatus.DRAFT,
        category: { id: createProductDto.categoryId },
      });
      await this.invalidateProductReadCaches();
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
    await this.invalidateProductReadCaches();
    return this.sortProductVariants(await Product.findOneBy({ id: productId }));
  }

  async updateVariant(
    variantId: number,
    updateProductVariantDto: UpdateProductVariantDto,
  ) {
    const variant = await ProductVariant.findOneBy({ id: variantId });
    if (!variant) {
      return new NotFoundException(`Variant with ID ${variantId} not found`);
    }
    await ProductVariant.update(variantId, updateProductVariantDto);
    await this.invalidateProductReadCaches();
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

    await this.invalidateProductReadCaches();
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
    await this.invalidateProductReadCaches();
    return this.sortProductVariants(
      await Product.findOneBy({ id: product.id }),
    );
  }

  /**
   * Lean product list: 2 SQL round-trips (products+category, first variant only),
   * truncated description, short cache. Avoids TypeORM eager multi-query fan-out.
   */
  async findAll(search: ProductSearchDto, includePrices = false) {
    const take = Math.min(Math.max(Number(search.take) || 10, 1), 100);
    const skip = Math.max(Number(search.skip) || 0, 0);
    const state = search.state || ProductStatus.ACTIVE;
    const categoryId = search.categoryId ? Number(search.categoryId) : null;
    const q = search.q?.trim() || null;
    const includeOutOfStock = Boolean(search.includeOutOfStock);

    const cacheKey = [
      'products:list:v2',
      this.productReadCacheGen,
      includePrices ? 'p' : 'np',
      state,
      categoryId ?? 'all',
      skip,
      take,
      includeOutOfStock ? 'oos' : 'in',
      q || '',
    ].join(':');

    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const inflight = this.listInflight.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const promise = this.computeFindAll({
      take,
      skip,
      state,
      categoryId,
      q,
      includeOutOfStock,
      includePrices,
    })
      .then(async (products) => {
        await this.cacheManager.set(cacheKey, products, this.listCacheTtlMs);
        return products;
      })
      .finally(() => {
        this.listInflight.delete(cacheKey);
      });

    this.listInflight.set(cacheKey, promise);
    return promise;
  }

  private async computeFindAll(opts: {
    take: number;
    skip: number;
    state: ProductStatus;
    categoryId: number | null;
    q: string | null;
    includeOutOfStock: boolean;
    includePrices: boolean;
  }) {
    const productRows: Array<Record<string, any>> = await this.dataSource.query(
      `
      SELECT
        p.id,
        p.name,
        LEFT(
          REGEXP_REPLACE(COALESCE(p.description, ''), '<[^>]+>', '', 'g'),
          160
        ) AS description,
        p.state,
        p."stockAvailable" AS "stockAvailable",
        p."hotProduct" AS "hotProduct",
        p.index,
        p."categoryIndex" AS "categoryIndex",
        p."shippingCost"::text AS "shippingCost",
        p.images,
        p."basePrice"::text AS "basePrice",
        p."caseSize" AS "caseSize",
        p."allowCaseOrder" AS "allowCaseOrder",
        p."categoryId" AS "categoryId",
        p."createdAt" AS "createdAt",
        p."updateAt" AS "updateAt",
        c.id AS "catId",
        c.name AS "catName",
        c.slug AS "catSlug",
        c.index AS "catIndex",
        c.image AS "catImage"
      FROM products p
      INNER JOIN category c
        ON c.id = p."categoryId"
        AND c."deletedAt" IS NULL
      WHERE p."deletedAt" IS NULL
        AND p.state = $1
        AND ($2::int IS NULL OR p."categoryId" = $2)
        AND ($3::boolean OR p."stockAvailable" = true)
        AND (
          $4::text IS NULL
          OR p.name ILIKE '%' || $4 || '%'
          OR p.description ILIKE '%' || $4 || '%'
        )
      ORDER BY p."categoryIndex" ASC, p.index ASC, p."createdAt" DESC
      LIMIT $5 OFFSET $6
      `,
      [
        opts.state,
        opts.categoryId,
        opts.includeOutOfStock,
        opts.q,
        opts.take,
        opts.skip,
      ],
    );

    if (!productRows.length) {
      return [];
    }

    const productIds = productRows.map((row) => Number(row.id));
    const variantRows: Array<Record<string, any>> = await this.dataSource.query(
      `
      SELECT DISTINCT ON (v."productId")
        v.id,
        v."productId" AS "productId",
        v.name,
        v.sku,
        v.images,
        v."stockAvailable" AS "stockAvailable",
        v."sortOrder" AS "sortOrder",
        v.price::text AS price,
        v."dealerPrice"::text AS "dealerPrice",
        v."distributorPrice"::text AS "distributorPrice",
        v."contractorPrice"::text AS "contractorPrice"
      FROM product_variants v
      WHERE v."productId" = ANY($1::int[])
        AND v."deletedAt" IS NULL
      ORDER BY v."productId", v."sortOrder" ASC, v.id ASC
      `,
      [productIds],
    );

    const variantByProductId = new Map<number, any>();
    for (const row of variantRows) {
      const variant: any = {
        id: Number(row.id),
        name: row.name,
        sku: row.sku,
        images: this.parseImages(row.images),
        stockAvailable: Boolean(row.stockAvailable),
        productId: Number(row.productId),
        sortOrder: Number(row.sortOrder || 0),
      };
      if (opts.includePrices) {
        variant.price = row.price;
        variant.dealerPrice = row.dealerPrice;
        variant.distributorPrice = row.distributorPrice;
        variant.contractorPrice = row.contractorPrice;
      }
      variantByProductId.set(Number(row.productId), variant);
    }

    return productRows.map((row) => {
      const product: any = {
        id: Number(row.id),
        name: row.name,
        description: row.description || '',
        state: row.state,
        stockAvailable: Boolean(row.stockAvailable),
        hotProduct: Boolean(row.hotProduct),
        index: Number(row.index || 0),
        categoryIndex: Number(row.categoryIndex || 0),
        shippingCost: row.shippingCost,
        images: this.parseImages(row.images),
        caseSize: Number(row.caseSize || 12),
        allowCaseOrder: Boolean(row.allowCaseOrder),
        categoryId: Number(row.categoryId),
        createdAt: row.createdAt,
        updateAt: row.updateAt,
        deletedAt: null,
        category: {
          id: Number(row.catId),
          name: row.catName,
          slug: row.catSlug,
          index: Number(row.catIndex || 0),
          image: row.catImage,
        },
        variants: variantByProductId.has(Number(row.id))
          ? [variantByProductId.get(Number(row.id))]
          : [],
      };
      if (opts.includePrices) {
        product.basePrice = row.basePrice;
      }
      return product;
    });
  }

  async findOne(id: number, includePrices = false) {
    const cacheKey = `products:detail:v2:${this.productReadCacheGen}:${id}:${includePrices ? 'p' : 'np'}`;

    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const inflight = this.detailInflight.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const promise = this.computeFindOne(id, includePrices)
      .then(async (product) => {
        if (product) {
          await this.cacheManager.set(
            cacheKey,
            product,
            this.detailCacheTtlMs,
          );
        }
        return product;
      })
      .finally(() => {
        this.detailInflight.delete(cacheKey);
      });

    this.detailInflight.set(cacheKey, promise);
    return promise;
  }

  private async computeFindOne(id: number, includePrices: boolean) {
    const productRows: Array<Record<string, any>> = await this.dataSource.query(
      `
      SELECT
        p.id,
        p.name,
        p.description,
        p.state,
        p."stockAvailable" AS "stockAvailable",
        p."hotProduct" AS "hotProduct",
        p.index,
        p."categoryIndex" AS "categoryIndex",
        p."shippingCost"::text AS "shippingCost",
        p.images,
        p."basePrice"::text AS "basePrice",
        p."caseSize" AS "caseSize",
        p."allowCaseOrder" AS "allowCaseOrder",
        p."categoryId" AS "categoryId",
        p."createdAt" AS "createdAt",
        p."updateAt" AS "updateAt",
        c.id AS "catId",
        c.name AS "catName",
        c.slug AS "catSlug",
        c.index AS "catIndex",
        c.image AS "catImage",
        c.description AS "catDescription"
      FROM products p
      INNER JOIN category c
        ON c.id = p."categoryId"
        AND c."deletedAt" IS NULL
      WHERE p.id = $1
        AND p."deletedAt" IS NULL
      LIMIT 1
      `,
      [id],
    );

    if (!productRows.length) {
      return null;
    }

    const row = productRows[0];
    const variantRows: Array<Record<string, any>> = await this.dataSource.query(
      `
      SELECT
        v.id,
        v."productId" AS "productId",
        v.name,
        v.sku,
        v.images,
        v."stockAvailable" AS "stockAvailable",
        v."sortOrder" AS "sortOrder",
        v.price::text AS price,
        v."dealerPrice"::text AS "dealerPrice",
        v."distributorPrice"::text AS "distributorPrice",
        v."contractorPrice"::text AS "contractorPrice",
        v."createdAt" AS "createdAt",
        v."updateAt" AS "updateAt"
      FROM product_variants v
      WHERE v."productId" = $1
        AND v."deletedAt" IS NULL
      ORDER BY v."sortOrder" ASC, v.id ASC
      `,
      [id],
    );

    const variants = variantRows.map((variant) => {
      const mapped: any = {
        id: Number(variant.id),
        name: variant.name,
        sku: variant.sku,
        images: this.parseImages(variant.images),
        stockAvailable: Boolean(variant.stockAvailable),
        productId: Number(variant.productId),
        sortOrder: Number(variant.sortOrder || 0),
        createdAt: variant.createdAt,
        updateAt: variant.updateAt,
        deletedAt: null,
      };
      if (includePrices) {
        mapped.price = variant.price;
        mapped.dealerPrice = variant.dealerPrice;
        mapped.distributorPrice = variant.distributorPrice;
        mapped.contractorPrice = variant.contractorPrice;
      }
      return mapped;
    });

    const product: any = {
      id: Number(row.id),
      name: row.name,
      description: row.description,
      state: row.state,
      stockAvailable: Boolean(row.stockAvailable),
      hotProduct: Boolean(row.hotProduct),
      index: Number(row.index || 0),
      categoryIndex: Number(row.categoryIndex || 0),
      shippingCost: row.shippingCost,
      images: this.parseImages(row.images),
      caseSize: Number(row.caseSize || 12),
      allowCaseOrder: Boolean(row.allowCaseOrder),
      categoryId: Number(row.categoryId),
      createdAt: row.createdAt,
      updateAt: row.updateAt,
      deletedAt: null,
      category: {
        id: Number(row.catId),
        name: row.catName,
        slug: row.catSlug,
        index: Number(row.catIndex || 0),
        image: row.catImage,
        description: row.catDescription,
      },
      variants,
    };

    if (includePrices) {
      product.basePrice = row.basePrice;
    }

    return product;
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

    if (updateProductDto.state === ProductStatus.ACTIVE) {
      if (!product.variants || product.variants.length === 0) {
        throw new BadRequestException(
          'Cannot set product status to ACTIVE when no variants are available',
        );
      }
    }

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

    await this.invalidateProductReadCaches();
    return this.sortProductVariants(await Product.findOneBy({ id }));
  }

  async remove(id: number) {
    const product = await Product.findOneBy({ id });
    await product.softRemove();
    await this.invalidateProductReadCaches();
    return product;
  }
}
