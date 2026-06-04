import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';
import { ethers } from 'ethers';
import { createRemoteJWKSet, jwtVerify } from 'jose';
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
    await this.redis.set(key, nonce, { ex: 300 });

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

    await this.redis.del(key);

    const adminAddress = this.config.get<string>('ADMIN_WALLET_ADDRESS', '');
    const lowerAddr = address.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { walletAddress: lowerAddr } });

    const payload: JwtPayload = {
      sub: lowerAddr,
      walletAddress: lowerAddr,
      isRegistered: !!user,
      isProducer: user?.isProducer ?? false,
      isAdmin: lowerAddr === adminAddress.toLowerCase(),
      name: user?.name,
    };

    return {
      token: this.jwt.sign(payload),
      user: {
        walletAddress: lowerAddr,
        isRegistered: payload.isRegistered,
        isProducer: payload.isProducer,
        isAdmin: payload.isAdmin,
        name: user?.name,
      },
    };
  }

  async loginWithPrivy(privyToken: string): Promise<{ token: string; user: object }> {
    const appId = this.config.get<string>('PRIVY_APP_ID', '');
    if (!appId) throw new BadRequestException('Configuração Privy ausente no servidor');

    let privyDid: string;
    let walletAddress: string | undefined;

    try {
      const JWKS = createRemoteJWKSet(
        new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`),
      );
      const { payload } = await jwtVerify(privyToken, JWKS, {
        issuer: 'privy.io',
        audience: appId,
      });
      privyDid = payload.sub as string;
      // Privy coloca o endereço da embedded wallet no campo `wallet_address`
      walletAddress = (payload as Record<string, unknown>).wallet_address as string | undefined;
      if (walletAddress) walletAddress = walletAddress.toLowerCase();
    } catch {
      throw new UnauthorizedException('Token Privy inválido ou expirado');
    }

    // Busca usuário existente por privyDid ou walletAddress
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { privyDid },
          ...(walletAddress ? [{ walletAddress }] : []),
        ],
      },
    });

    // Se existe mas ainda não tem privyDid vinculado, vincula
    if (user && !user.privyDid) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { privyDid },
      });
    }

    const adminAddress = this.config.get<string>('ADMIN_WALLET_ADDRESS', '');
    const isAdmin =
      (walletAddress && walletAddress === adminAddress.toLowerCase()) ||
      (user?.isAdmin ?? false);

    const payload: JwtPayload = {
      sub: privyDid,
      privyDid,
      walletAddress: user?.walletAddress ?? walletAddress,
      isRegistered: !!user,
      isProducer: user?.isProducer ?? false,
      isAdmin,
      name: user?.name,
    };

    return {
      token: this.jwt.sign(payload),
      user: {
        privyDid,
        walletAddress: user?.walletAddress ?? walletAddress,
        isRegistered: payload.isRegistered,
        isProducer: payload.isProducer,
        isAdmin: payload.isAdmin,
        name: user?.name,
      },
    };
  }
}
