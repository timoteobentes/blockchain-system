import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class ProducersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { isProducer: true },
      orderBy: { onChainAt: 'asc' },
      select: { id: true, userHash: true, name: true, walletAddress: true, onChainAt: true },
    });
  }

  async promote(address: string) {
    const user = await this.prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado no banco. Aguarde a sincronização ou verifique se está registrado on-chain.');
    if (user.isProducer) throw new BadRequestException('Usuário já é produtor');

    // Envia transação on-chain (backend assina como admin)
    const txHash = await this.blockchain.makeProducer(address);

    // Atualiza DB imediatamente (indexer também vai sincronizar via evento)
    await this.prisma.user.update({
      where: { walletAddress: address.toLowerCase() },
      data: { isProducer: true },
    });

    return { success: true, txHash, message: 'Usuário promovido a produtor' };
  }
}
