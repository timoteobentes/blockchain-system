import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtPayload } from '../auth/decorators/current-user.decorator';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
  ) {}

  async findAll(query: ProductQueryDto) {
    const { page = 1, limit = 20, active, producer, owner } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (active !== undefined) where.active = active;
    if (producer) where.producerAddress = producer.toLowerCase();
    if (owner) where.currentOwnerAddress = owner.toLowerCase();

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip, take: limit,
        orderBy: { syncedAt: 'desc' },
        include: { traces: { orderBy: { blockTimestamp: 'asc' }, take: 1 } },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findMine(jwtUser: JwtPayload, query: ProductQueryDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(jwtUser.privyDid ? [{ privyDid: jwtUser.privyDid }] : []),
          ...(jwtUser.walletAddress ? [{ walletAddress: jwtUser.walletAddress }] : []),
          { walletAddress: jwtUser.sub },
        ],
      },
      select: { walletAddress: true, privyDid: true },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');

    const producerFilters: any[] = [
      ...(user.walletAddress ? [{ producerAddress: user.walletAddress }] : []),
      ...(user.privyDid ? [{ producerAddress: user.privyDid }] : []),
    ];

    if (producerFilters.length === 0) {
      return { data: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 20 };
    }

    const { page = 1, limit = 20, active } = query;
    const skip = (page - 1) * limit;
    const where: any = { OR: producerFilters };
    if (active !== undefined) where.active = active;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip, take: limit,
        orderBy: { syncedAt: 'desc' },
        include: { traces: { orderBy: { blockTimestamp: 'asc' }, take: 1 } },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(lotId: string) {
    const product = await this.prisma.product.findUnique({
      where: { lotId },
      include: { traces: { orderBy: { blockTimestamp: 'asc' } } },
    });
    if (!product) throw new NotFoundException('Produção não encontrada');
    return product;
  }

  async findPublic(lotId: string) {
    const product = await this.prisma.product.findUnique({
      where: { lotId },
      select: {
        lotId: true,
        productName: true,
        producerName: true,
        currentOwnerName: true,
        originType: true,
        origin: true,
        volume: true,
        unit: true,
        active: true,
        syncStatus: true,
        onChainAt: true,
        documentHash: true,
        producerAddress: true,
        currentOwnerAddress: true,
        traces: {
          orderBy: { blockTimestamp: 'asc' },
          select: {
            id: true,
            action: true,
            fromName: true,
            toName: true,
            fromAddress: true,
            toAddress: true,
            blockTimestamp: true,
            txHash: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Produção não encontrada');
    return product;
  }

  async getHistory(lotId: string) {
    const product = await this.prisma.product.findUnique({ where: { lotId } });
    if (!product) throw new NotFoundException('Produção não encontrada');
    return this.prisma.trace.findMany({
      where: { productId: product.id },
      orderBy: { blockTimestamp: 'asc' },
    });
  }

  async deactivate(lotId: string) {
    const product = await this.prisma.product.findUnique({ where: { lotId } });
    if (!product) throw new NotFoundException('Produção não encontrada');

    const txHash = await this.blockchain.deactivateProduct(lotId);
    await this.prisma.product.update({ where: { lotId }, data: { active: false } });

    return { success: true, txHash, message: 'Produção desativada' };
  }
}
