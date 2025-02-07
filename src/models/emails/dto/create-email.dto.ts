import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateEmailDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email: string;
}
