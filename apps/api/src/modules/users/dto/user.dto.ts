import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumberString } from 'class-validator';
import { Type } from 'class-transformer';

export class UserQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userHash: string;
  @ApiProperty() name: string;
  @ApiProperty() walletAddress: string;
  @ApiProperty() isProducer: boolean;
  @ApiProperty() onChainAt: Date;
}
