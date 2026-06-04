import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;           // privyDid ou walletAddress
  privyDid?: string;     // Privy DID (did:privy:xxx)
  walletAddress?: string; // Carteira blockchain (opcional)
  isRegistered: boolean;
  isProducer: boolean;
  isAdmin: boolean;
  name?: string;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
