import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDTO {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  token: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  oldToken: string;

  @IsBoolean({})
  @IsOptional()
  @ApiProperty()
  fromAdmin?: boolean;
}
