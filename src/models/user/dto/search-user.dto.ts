import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Pagination } from 'src/common/dtos/pagination.dto';
import { UserRole } from '../entities/user.entity';

export class SearchUserDto extends Pagination {
  @ApiPropertyOptional({
    description: 'Search query that matches against user name or email'
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Role of the user to search for'
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Approval status of the user to search for'
  })
  @IsOptional()
  @IsEnum({
    enum: ['all', 'approved', 'unapproved'],
  })
  approved?: string;
}