import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { NonceRequestDto, VerifySignatureDto, PrivyLoginDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('nonce')
  @HttpCode(200)
  @ApiOperation({ summary: 'Gera nonce para assinatura de carteira' })
  nonce(@Body() dto: NonceRequestDto) {
    return this.authService.generateNonce(dto.address);
  }

  @Post('verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verifica assinatura de carteira e retorna JWT' })
  verify(@Body() dto: VerifySignatureDto) {
    return this.authService.verifyAndLogin(dto.address, dto.signature);
  }

  @Post('privy-login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Autentica via token Privy (sem assinatura de carteira)' })
  privyLogin(@Body() dto: PrivyLoginDto) {
    return this.authService.loginWithPrivy(dto.privyToken);
  }
}
