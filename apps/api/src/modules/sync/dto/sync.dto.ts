import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEthereumAddress, Min } from 'class-validator';

export class RegisterUserOfflineDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() cpf: string;
  @IsString() @IsNotEmpty() walletAddress: string;
}

export class AddProductOfflineDto {
  @IsString() @IsNotEmpty() lotId: string;
  @IsNumber() @Min(1) volume: number;
  @IsString() @IsNotEmpty() origin: string;
  @IsString() @IsNotEmpty() documentHash: string;
  @IsString() @IsNotEmpty() producerAddress: string;
}

export class TransferOfflineDto {
  @IsString() @IsNotEmpty() lotId: string;
  @IsString() @IsNotEmpty() fromAddress: string;
  @IsString() @IsNotEmpty() toAddress: string;
}

export class ConfirmSyncDto {
  @IsString() @IsNotEmpty() txHash: string;
}
