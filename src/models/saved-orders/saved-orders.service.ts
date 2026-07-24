import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSavedOrderDto } from './dto/create-saved-order.dto';
import { UpdateSavedOrderDto } from './dto/update-saved-order.dto';
import { SavedOrder } from './entities/saved-order.entity';
import { SavedOrderItem } from './entities/saved-order-item.entity';
import { User } from '../user/entities/user.entity';
import { Pagination } from 'src/common/dtos/pagination.dto';

@Injectable()
export class SavedOrdersService {
  private mapItems(items: CreateSavedOrderDto['items']): SavedOrderItem[] {
    return items.map((item) => {
      const savedItem = new SavedOrderItem();
      savedItem.productId = item.productId;
      savedItem.variantId = item.variantId;
      savedItem.quantity = item.quantity;
      savedItem.quantityType = item.quantityType;
      savedItem.name = item.name;
      savedItem.variantName = item.variantName;
      savedItem.image = item.image || '';
      savedItem.price = item.price;
      savedItem.caseSize = item.caseSize;
      savedItem.isPairProduct = !!item.isPairProduct;
      return savedItem;
    });
  }

  async create(dto: CreateSavedOrderDto, userId: string) {
    if (!dto.items?.length) {
      throw new BadRequestException('Saved order must include at least one item');
    }

    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const savedOrder = new SavedOrder();
    savedOrder.user = user;
    savedOrder.name = dto.name.trim();
    savedOrder.notes = dto.notes || null;
    savedOrder.paymentOrder = dto.paymentOrder || null;
    savedOrder.items = this.mapItems(dto.items);

    return await savedOrder.save();
  }

  async findMySavedOrders(userId: string, pagination: Pagination) {
    return await SavedOrder.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: pagination.take || 20,
      skip: pagination.skip || 0,
    });
  }

  async findOne(id: number, userId: string) {
    const savedOrder = await SavedOrder.findOne({
      where: { id },
    });

    if (!savedOrder) {
      throw new NotFoundException(`Saved order with ID ${id} not found`);
    }

    if (savedOrder.user?.id !== userId) {
      throw new ForbiddenException('You do not have access to this saved order');
    }

    return savedOrder;
  }

  async update(id: number, dto: UpdateSavedOrderDto, userId: string) {
    const savedOrder = await this.findOne(id, userId);

    if (dto.name !== undefined) {
      savedOrder.name = dto.name.trim();
    }
    if (dto.notes !== undefined) {
      savedOrder.notes = dto.notes || null;
    }
    if (dto.paymentOrder !== undefined) {
      savedOrder.paymentOrder = dto.paymentOrder || null;
    }

    if (dto.items !== undefined) {
      if (!dto.items.length) {
        throw new BadRequestException(
          'Saved order must include at least one item',
        );
      }
      // Replace items: remove old, attach new
      if (savedOrder.items?.length) {
        await SavedOrderItem.remove(savedOrder.items);
      }
      savedOrder.items = this.mapItems(dto.items);
    }

    return await savedOrder.save();
  }

  async remove(id: number, userId: string) {
    const savedOrder = await this.findOne(id, userId);
    await savedOrder.softRemove();
    return { success: true, id };
  }
}
