import { ApiProperty } from '@nestjs/swagger';
import { MinLength, IsUUID, Length } from 'class-validator';

export class ResetPasswordWithCodeDto {
  @ApiProperty()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsUUID('4')
  uuid: string;

  @ApiProperty()
  @Length(6)
  code: string;
}
