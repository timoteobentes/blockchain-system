import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class RegisterUserOfflineDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() cpf?: string;
}

export class AddProductOfflineDto {
  @IsString() @IsNotEmpty() lotId: string;
  @IsNumber() @Min(1) volume: number;
  @IsString() @IsNotEmpty() origin: string;
  @IsString() @IsOptional() originType?: string;
  @IsString() @IsNotEmpty() documentHash: string;
  @IsString() @IsOptional() productName?: string;
  @IsString() @IsOptional() unit?: string;
  @IsNumber() @IsOptional() pricePerUnit?: number;
}

export class TransferOfflineDto {
  @IsString() @IsNotEmpty() lotId: string;
  @IsString() @IsNotEmpty() toAddress: string;
}

export class ConfirmSyncDto {
  @IsString() @IsNotEmpty() txHash: string;
}
