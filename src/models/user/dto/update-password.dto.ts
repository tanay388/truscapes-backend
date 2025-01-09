import { ApiProperty } from '@nestjs/swagger';
import { MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty()
  @MinLength(6)
  oldPassword: string;

  @ApiProperty()
  @MinLength(6)
  password: string;
}
