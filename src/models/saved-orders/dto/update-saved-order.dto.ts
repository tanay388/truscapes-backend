import { PartialType } from '@nestjs/swagger';
import { CreateSavedOrderDto } from './create-saved-order.dto';

export class UpdateSavedOrderDto extends PartialType(CreateSavedOrderDto) {}
