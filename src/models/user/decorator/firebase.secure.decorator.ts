import { UseGuards } from '@nestjs/common';
import { FirebaseUserGuard } from '../guards/user.guard';

export function FirebaseSecure() {
  return UseGuards(FirebaseUserGuard);
}
