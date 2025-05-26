import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Pagination } from 'src/common/dtos/pagination.dto';

export class SearchUserDto extends Pagination {
  @ApiPropertyOptional({
    description: 'Search query that matches against user name or email'
  })
  @IsOptional()
  @IsString()
  query?: string;
}