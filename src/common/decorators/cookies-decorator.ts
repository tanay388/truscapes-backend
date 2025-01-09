import { createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

export const Cookies = createParamDecorator((data: string, ctx) => {
  const request: Request = ctx.switchToHttp().getRequest();

  return data ? request.cookies?.[data] : request.cookies;
});
