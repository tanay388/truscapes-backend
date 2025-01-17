import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { AdminOnlyGuard } from '../guards/admin-only.guard';
import { FirebaseSecure } from './firebase.secure.decorator';

export const IS_ADMIN_KEY = 'isAdmin';
export const AdminOnly = () => {
  return applyDecorators(
    SetMetadata(IS_ADMIN_KEY, true),
    UseGuards(AdminOnlyGuard),
    FirebaseSecure(),
  );
};