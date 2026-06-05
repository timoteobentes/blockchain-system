import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';

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

  // Para usuários cadastrados com carteira
  @IsString() @IsOptional() toAddress?: string;

  // Para destinatários externos (não cadastrados na plataforma)
  @ValidateIf(o => !o.toAddress)
  @IsString() @IsNotEmpty() toName?: string;

  @IsString() @IsOptional() toCpfCnpj?: string;

  // PESSOA | ASSOCIACAO | COOPERATIVA
  @IsString() @IsOptional() toType?: string;
}

export class ConfirmSyncDto {
  @IsString() @IsNotEmpty() txHash: string;
}
