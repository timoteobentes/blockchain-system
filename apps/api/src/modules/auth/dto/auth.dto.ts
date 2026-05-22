import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress, IsString, IsNotEmpty } from 'class-validator';

export class NonceRequestDto {
  @ApiProperty({ example: '0xAbC...123' })
  @IsEthereumAddress()
  address: string;
}

export class VerifySignatureDto {
  @ApiProperty({ example: '0xAbC...123' })
  @IsEthereumAddress()
  address: string;

  @ApiProperty({ description: 'Assinatura da mensagem com nonce' })
  @IsString()
  @IsNotEmpty()
  signature: string;
}

export class AuthResponseDto {
  @ApiProperty()
  token: string;

  @ApiProperty()
  user: {
    address: string;
    isRegistered: boolean;
    isProducer: boolean;
    name?: string;
  };
}
