import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductSearchDto } from './dto/product-search.dto';
import { ApiTags } from '@nestjs/swagger';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ReorderProductVariantsDto } from './dto/reorder-product-variants.dto';
import { FUser } from '../user/decorator/firebase.user.decorator';
import { FirebaseUser } from 'src/providers/firebase/firebase.service';

@Controller('products')
@ApiTags('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Post('add-variant/:productId')
  addVariant(
    @Param('productId') productId: string,
    @Body() createProductVariantDto: CreateProductVariantDto,
  ) {
    return this.productsService.addVariant(+productId, createProductVariantDto);
  }

  @Patch('update-variant/:variantId')
  updateVariant(
    @Param('variantId') variantId: string,
    @Body() updateProductVariantDto: UpdateProductVariantDto,
  ) {
    return this.productsService.updateVariant(
      +variantId,
      updateProductVariantDto,
    );
  }

  @Patch('reorder-variants/:productId')
  reorderVariants(
    @Param('productId') productId: string,
    @Body() reorderProductVariantsDto: ReorderProductVariantsDto,
  ) {
    return this.productsService.reorderVariants(
      +productId,
      reorderProductVariantsDto,
    );
  }

  @Delete('remove-variant/:variantId')
  removeVariant(@Param('variantId') variantId: string) {
    return this.productsService.removeVariant(+variantId);
  }

  @Get('home-preview')
  getHomePreview(
    @Query('take') take?: string,
    @FUser() user?: FirebaseUser,
  ) {
    return this.productsService.getHomePreview(
      take ? Number(take) : 8,
      Boolean(user),
    );
  }

  @Get()
  findAll(
    @Query() search: ProductSearchDto,
    @FUser() user?: FirebaseUser,
  ) {
    return this.productsService.findAll(search, Boolean(user));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @FUser() user?: FirebaseUser) {
    return this.productsService.findOne(+id, Boolean(user));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(+id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }
}
