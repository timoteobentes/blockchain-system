import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { NonceRequestDto, VerifySignatureDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('nonce')
  @HttpCode(200)
  @ApiOperation({ summary: 'Gera nonce para assinatura MetaMask' })
  nonce(@Body() dto: NonceRequestDto) {
    return this.authService.generateNonce(dto.address);
  }

  @Post('verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verifica assinatura e retorna JWT' })
  verify(@Body() dto: VerifySignatureDto) {
    return this.authService.verifyAndLogin(dto.address, dto.signature);
  }
}
