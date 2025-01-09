import { Provider } from '@nestjs/common';
import { HttpErrorFilter } from './error-log';

export const HttpErrorFilterProvider: Provider = {
  provide: HttpErrorFilter,
  useClass: HttpErrorFilter,
};
