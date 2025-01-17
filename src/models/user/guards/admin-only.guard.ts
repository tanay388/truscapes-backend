import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_ADMIN_KEY } from '../decorator/admin-only.decorator';
import { UserRole } from '../entities/user.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class AdminOnlyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAdmin = this.reflector.getAllAndOverride<boolean>(IS_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isAdmin) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const firebaseUser = request.user;

    if (!firebaseUser) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Get the user from database
    const user = await User.findOne({
      where: { id: firebaseUser.uid },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('User is not an admin');
    }

    return true;
  }
}