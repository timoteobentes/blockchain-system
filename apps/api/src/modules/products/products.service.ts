import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ProductQueryDto } from './dto/product-query.dto';

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
        where,
        skip,
        take: limit,
        orderBy: { onChainAt: 'desc' },
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
    if (!product) throw new NotFoundException('Lote não encontrado');
    return product;
  }

  async getHistory(lotId: string) {
    const product = await this.prisma.product.findUnique({ where: { lotId } });
    if (!product) throw new NotFoundException('Lote não encontrado');

    return this.prisma.trace.findMany({
      where: { productId: product.id },
      orderBy: { blockTimestamp: 'asc' },
    });
  }

  async deactivate(lotId: string) {
    const product = await this.prisma.product.findUnique({ where: { lotId } });
    if (!product) throw new NotFoundException('Lote não encontrado');

    const txHash = await this.blockchain.deactivateProduct(lotId);

    await this.prisma.product.update({
      where: { lotId },
      data: { active: false },
    });

    return { success: true, txHash, message: 'Lote desativado' };
  }
}
