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

  @Delete('remove-variant/:variantId')
  removeVariant(@Param('variantId') variantId: string) {
    return this.productsService.removeVariant(+variantId);
  }

  @Get()
  findAll(@Query() search: ProductSearchDto) {
    return this.productsService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
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
