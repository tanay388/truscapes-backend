import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SavedOrdersService } from './saved-orders.service';
import { CreateSavedOrderDto } from './dto/create-saved-order.dto';
import { UpdateSavedOrderDto } from './dto/update-saved-order.dto';
import { FirebaseSecure } from '../user/decorator/firebase.secure.decorator';
import { FUser } from '../user/decorator/firebase.user.decorator';
import { FirebaseUser } from 'src/providers/firebase/firebase.service';
import { Pagination } from 'src/common/dtos/pagination.dto';

@ApiTags('Saved Orders')
@Controller('saved-orders')
@ApiBearerAuth()
@FirebaseSecure()
export class SavedOrdersController {
  constructor(private readonly savedOrdersService: SavedOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Save a cart as a draft order' })
  create(
    @Body() createSavedOrderDto: CreateSavedOrderDto,
    @FUser() user: FirebaseUser,
  ) {
    return this.savedOrdersService.create(createSavedOrderDto, user.uid);
  }

  @Get('my')
  @ApiOperation({ summary: "List current user's saved orders" })
  findMy(@FUser() user: FirebaseUser, @Query() pagination: Pagination) {
    return this.savedOrdersService.findMySavedOrders(user.uid, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a saved order by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @FUser() user: FirebaseUser,
  ) {
    return this.savedOrdersService.findOne(id, user.uid);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a saved order' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSavedOrderDto: UpdateSavedOrderDto,
    @FUser() user: FirebaseUser,
  ) {
    return this.savedOrdersService.update(id, updateSavedOrderDto, user.uid);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a saved order' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @FUser() user: FirebaseUser,
  ) {
    return this.savedOrdersService.remove(id, user.uid);
  }
}
