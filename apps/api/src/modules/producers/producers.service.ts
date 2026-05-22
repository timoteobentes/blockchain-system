import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class ProducersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
    private readonly config: ConfigService,
  ) {}

  private isBlockchainEnabled(): boolean {
    const val = this.config.get<string>('BLOCKCHAIN_ENABLED', 'true');
    return val !== 'false' && val !== '0';
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { isProducer: true },
      orderBy: { onChainAt: 'asc' },
      select: { id: true, userHash: true, name: true, walletAddress: true, syncStatus: true, onChainAt: true },
    });
  }

  async promote(address: string) {
    const user = await this.prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado. Verifique se está registrado.');
    if (user.isProducer) throw new BadRequestException('Usuário já é produtor');

    if (!this.isBlockchainEnabled() || !this.blockchain.isReady()) {
      // Offline mode: save to DB and create pending operation
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { walletAddress: address.toLowerCase() },
          data: { isProducer: true, syncStatus: 'PENDING' },
        }),
        this.prisma.pendingOperation.create({
          data: {
            type: 'MAKE_PRODUCER',
            params: { userAddress: address },
            userAddress: 'ADMIN',
            refId: address.toLowerCase(),
            status: 'PENDING',
          },
        }),
      ]);
      return { success: true, txHash: null, syncStatus: 'PENDING', message: 'Promoção registrada — aguardando sincronização com blockchain' };
    }

    const txHash = await this.blockchain.makeProducer(address);

    await this.prisma.user.update({
      where: { walletAddress: address.toLowerCase() },
      data: { isProducer: true, syncStatus: 'SYNCED' },
    });

    return { success: true, txHash, syncStatus: 'SYNCED', message: 'Usuário promovido a produtor' };
  }
}
