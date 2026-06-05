import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumberString, IsString, IsNumber } from 'class-validator';
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

export class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() phone2?: string;
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() addressNumber?: string;
  @IsOptional() @IsString() complement?: string;
  @IsOptional() @IsString() neighborhood?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsString() assocName?: string;
  @IsOptional() @IsString() assocCnpj?: string;
  @IsOptional() @IsString() assocRole?: string;
  @IsOptional() @IsNumber() landSizeHa?: number;
  @IsOptional() @IsString() landType?: string;
  @IsOptional() @IsString() bio?: string;
}
