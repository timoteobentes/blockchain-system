import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';
import { ethers } from 'ethers';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from './decorators/current-user.decorator';

@Injectable()
export class AuthService {
  private redis: Redis;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis({
      url: config.get('UPSTASH_REDIS_REST_URL') ?? '',
      token: config.get('UPSTASH_REDIS_REST_TOKEN') ?? '',
    });
  }

  async generateNonce(address: string): Promise<{ message: string }> {
    const nonce = Math.random().toString(36).substring(2, 15);
    const key = `nonce:${address.toLowerCase()}`;
    await this.redis.set(key, nonce, { ex: 300 }); // TTL 5 minutos

    const message = `Autenticar no SELVA\n\nEndereço: ${address}\nNonce: ${nonce}\n\nEsta assinatura não gera transação on-chain.`;
    return { message };
  }

  async verifyAndLogin(address: string, signature: string): Promise<{ token: string; user: object }> {
    const key = `nonce:${address.toLowerCase()}`;
    const nonce = await this.redis.get<string>(key);
    if (!nonce) throw new BadRequestException('Nonce expirado ou inexistente. Solicite um novo.');

    const message = `Autenticar no SELVA\n\nEndereço: ${address}\nNonce: ${nonce}\n\nEsta assinatura não gera transação on-chain.`;
    let recovered: string;
    try {
      recovered = ethers.verifyMessage(message, signature);
    } catch {
      throw new UnauthorizedException('Assinatura inválida');
    }

    if (recovered.toLowerCase() !== address.toLowerCase()) {
      throw new UnauthorizedException('Assinatura não corresponde ao endereço');
    }

    // Nonce de uso único
    await this.redis.del(key);

    const adminAddress = this.config.get<string>('ADMIN_WALLET_ADDRESS', '');
    const user = await this.prisma.user.findUnique({ where: { walletAddress: address.toLowerCase() } });

    const payload: JwtPayload = {
      sub: address.toLowerCase(),
      isRegistered: !!user,
      isProducer: user?.isProducer ?? false,
      isAdmin: address.toLowerCase() === adminAddress.toLowerCase(),
    };

    return {
      token: this.jwt.sign(payload),
      user: {
        address: address.toLowerCase(),
        isRegistered: payload.isRegistered,
        isProducer: payload.isProducer,
        isAdmin: payload.isAdmin,
        name: user?.name,
      },
    };
  }
}
