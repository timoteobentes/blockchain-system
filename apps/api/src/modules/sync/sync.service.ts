import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ethers } from 'ethers';
import {
  RegisterUserOfflineDto,
  AddProductOfflineDto,
  TransferOfflineDto,
} from './dto/sync.dto';

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  isBlockchainEnabled(): boolean {
    const val = this.config.get<string>('BLOCKCHAIN_ENABLED', 'true');
    return val !== 'false' && val !== '0';
  }

  async getStatus() {
    const enabled = this.isBlockchainEnabled();
    const pendingCount = await this.prisma.pendingOperation.count({
      where: { status: 'PENDING' },
    });
    return { blockchainEnabled: enabled, pendingOperations: pendingCount };
  }

  async getPendingForUser(userAddress: string) {
    return this.prisma.pendingOperation.findMany({
      where: { userAddress: userAddress.toLowerCase(), status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async registerUserOffline(dto: RegisterUserOfflineDto) {
    const addr = dto.walletAddress.toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { walletAddress: addr } });
    if (existing) throw new BadRequestException('Usuário já registrado');

    const userHash = ethers.keccak256(ethers.toUtf8Bytes(`offline:${addr}:${Date.now()}`));

    const [user, op] = await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          userHash,
          name: dto.name,
          cpf: dto.cpf,
          walletAddress: addr,
          isProducer: false,
          syncStatus: 'PENDING',
          onChainAt: new Date(),
        },
      }),
      this.prisma.pendingOperation.create({
        data: {
          type: 'REGISTER_USER',
          params: { name: dto.name, cpf: dto.cpf },
          userAddress: addr,
          refId: addr,
          status: 'PENDING',
        },
      }),
    ]);

    return { user, pendingOpId: op.id, syncStatus: 'PENDING' };
  }

  async addProductOffline(dto: AddProductOfflineDto) {
    const producer = dto.producerAddress.toLowerCase();

    const existing = await this.prisma.product.findUnique({ where: { lotId: dto.lotId } });
    if (existing) throw new BadRequestException('Produção já registrada');

    // Buscar nome do produtor
    const producerUser = await this.prisma.user.findUnique({
      where: { walletAddress: producer },
      select: { name: true },
    });
    const producerName = producerUser?.name ?? '';

    const traceId = `${dto.lotId}-CREATED-offline`;

    const [product, op] = await this.prisma.$transaction([
      this.prisma.product.create({
        data: {
          lotId: dto.lotId,
          volume: dto.volume,
          origin: dto.origin,
          originType: dto.originType ?? 'PESSOA',
          producerAddress: producer,
          producerName,
          currentOwnerAddress: producer,
          currentOwnerName: producerName,
          documentHash: dto.documentHash,
          active: true,
          syncStatus: 'PENDING',
          onChainAt: new Date(),
          traces: {
            create: {
              id: traceId,
              actor: producer,
              action: 'CREATED',
              docHash: dto.documentHash,
              fromAddress: ethers.ZeroAddress,
              toAddress: producer,
              fromName: '',
              toName: producerName,
              blockTimestamp: new Date(),
            },
          },
        },
      }),
      this.prisma.pendingOperation.create({
        data: {
          type: 'ADD_PRODUCT',
          params: {
            lotId: dto.lotId,
            volume: dto.volume,
            origin: dto.origin,
            originType: dto.originType ?? 'PESSOA',
            documentHash: dto.documentHash,
          },
          userAddress: producer,
          refId: dto.lotId,
          status: 'PENDING',
        },
      }),
    ]);

    return { product, pendingOpId: op.id, syncStatus: 'PENDING' };
  }

  async transferOffline(dto: TransferOfflineDto) {
    const product = await this.prisma.product.findUnique({ where: { lotId: dto.lotId } });
    if (!product) throw new NotFoundException('Produção não encontrada');
    if (!product.active) throw new BadRequestException('Produção inativa');
    if (product.currentOwnerAddress !== dto.fromAddress.toLowerCase()) {
      throw new BadRequestException('Você não é o responsável atual por esta produção');
    }

    const toAddr = dto.toAddress.toLowerCase();

    // Buscar nome do novo responsável
    const toUser = await this.prisma.user.findUnique({
      where: { walletAddress: toAddr },
      select: { name: true },
    });
    const toName = toUser?.name ?? '';
    const fromName = product.currentOwnerName ?? '';

    const traceId = `${dto.lotId}-TRANSFERRED-offline-${Date.now()}`;

    const [, op] = await this.prisma.$transaction([
      this.prisma.product.update({
        where: { lotId: dto.lotId },
        data: {
          currentOwnerAddress: toAddr,
          currentOwnerName: toName,
          syncStatus: 'PENDING',
          traces: {
            create: {
              id: traceId,
              actor: dto.fromAddress.toLowerCase(),
              action: 'TRANSFERRED',
              docHash: product.documentHash,
              fromAddress: dto.fromAddress.toLowerCase(),
              toAddress: toAddr,
              fromName,
              toName,
              blockTimestamp: new Date(),
            },
          },
        },
      }),
      this.prisma.pendingOperation.create({
        data: {
          type: 'TRANSFER_PRODUCT',
          params: { lotId: dto.lotId, toAddress: dto.toAddress },
          userAddress: dto.fromAddress.toLowerCase(),
          refId: dto.lotId,
          status: 'PENDING',
        },
      }),
    ]);

    return { lotId: dto.lotId, pendingOpId: op.id, syncStatus: 'PENDING' };
  }

  async confirmSync(opId: string, txHash: string, callerAddress: string) {
    const op = await this.prisma.pendingOperation.findUnique({ where: { id: opId } });
    if (!op) throw new NotFoundException('Operação pendente não encontrada');
    if (op.userAddress !== callerAddress.toLowerCase()) {
      throw new BadRequestException('Esta operação não pertence ao seu endereço');
    }
    if (op.status === 'SYNCED') throw new BadRequestException('Operação já sincronizada');

    await this.prisma.pendingOperation.update({
      where: { id: opId },
      data: { status: 'SYNCED', txHash },
    });

    if (op.type === 'REGISTER_USER' && op.refId) {
      await this.prisma.user.updateMany({
        where: { walletAddress: op.refId },
        data: { syncStatus: 'SYNCED' },
      });
    } else if ((op.type === 'ADD_PRODUCT' || op.type === 'TRANSFER_PRODUCT') && op.refId) {
      await this.prisma.trace.updateMany({
        where: { product: { lotId: op.refId }, txHash: null },
        data: { txHash },
      });
      const pendingTraces = await this.prisma.trace.count({
        where: { product: { lotId: op.refId }, txHash: null },
      });
      if (pendingTraces === 0) {
        await this.prisma.product.update({
          where: { lotId: op.refId },
          data: { syncStatus: 'SYNCED' },
        });
      }
    }

    return { success: true, txHash };
  }
}
