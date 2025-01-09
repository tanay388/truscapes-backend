import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const FUser = createParamDecorator((data, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;

  if (!user) return undefined;

  if (data) return user[data];
  return user;
});
