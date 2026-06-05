import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ethers } from 'ethers';
import { JwtPayload } from '../auth/decorators/current-user.decorator';
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

  async registerUserOffline(dto: RegisterUserOfflineDto, jwtUser: JwtPayload) {
    const privyDid = jwtUser.privyDid;
    const walletAddress = jwtUser.walletAddress?.toLowerCase();

    if (!privyDid && !walletAddress) {
      throw new BadRequestException('Identificador de usuário não encontrado no token');
    }

    // Verifica se já existe por privyDid ou walletAddress
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(privyDid ? [{ privyDid }] : []),
          ...(walletAddress ? [{ walletAddress }] : []),
        ],
      },
    });
    if (existing) throw new BadRequestException('Usuário já registrado');

    const identifier = privyDid ?? walletAddress!;
    const userHash = ethers.keccak256(ethers.toUtf8Bytes(`selva:${identifier}:${Date.now()}`));

    const user = await this.prisma.user.create({
      data: {
        userHash,
        name: dto.name,
        cpf: dto.cpf,
        privyDid,
        walletAddress,
        isProducer: false,
        syncStatus: walletAddress ? 'PENDING' : 'SYNCED',
      },
    });

    // Só cria operação pendente de blockchain se há carteira vinculada
    if (walletAddress) {
      await this.prisma.pendingOperation.create({
        data: {
          type: 'REGISTER_USER',
          params: { name: dto.name, cpf: dto.cpf },
          userAddress: walletAddress,
          refId: walletAddress,
          status: 'PENDING',
        },
      });
    }

    return { user, syncStatus: user.syncStatus };
  }

  async addProductOffline(dto: AddProductOfflineDto, jwtUser: JwtPayload) {
    const existing = await this.prisma.product.findUnique({ where: { lotId: dto.lotId } });
    if (existing) throw new BadRequestException('Produção já registrada');

    // Busca o produtor pelo privyDid ou walletAddress do JWT
    const producerUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(jwtUser.privyDid ? [{ privyDid: jwtUser.privyDid }] : []),
          ...(jwtUser.walletAddress ? [{ walletAddress: jwtUser.walletAddress }] : []),
          { walletAddress: jwtUser.sub },
        ],
      },
      select: { id: true, name: true, walletAddress: true, privyDid: true, isProducer: true },
    });

    if (!producerUser) throw new BadRequestException('Usuário não encontrado. Cadastre-se primeiro.');

    // Usa walletAddress se disponível, senão usa privyDid como identificador
    const producer = producerUser.walletAddress ?? producerUser.privyDid ?? jwtUser.sub;
    const producerName = producerUser.name ?? '';

    const traceId = `${dto.lotId}-CREATED-offline`;
    const hasWallet = !!producerUser.walletAddress;

    const product = await this.prisma.product.create({
      data: {
        lotId: dto.lotId,
        productName: dto.productName ?? '',
        volume: dto.volume,
        unit: dto.unit ?? 'KG',
        pricePerUnit: dto.pricePerUnit ?? null,
        origin: dto.origin,
        originType: dto.originType ?? 'PESSOA',
        producerAddress: producer,
        producerName,
        currentOwnerAddress: producer,
        currentOwnerName: producerName,
        documentHash: dto.documentHash,
        active: true,
        syncStatus: hasWallet ? 'PENDING' : 'SYNCED',
        onChainAt: hasWallet ? new Date() : null,
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
    });

    // Promove automaticamente para produtor ao cadastrar a primeira produção
    if (!producerUser.isProducer) {
      await this.prisma.user.update({
        where: { id: producerUser.id },
        data: { isProducer: true },
      });
    }

    // Só cria operação pendente de blockchain se produtor tem carteira
    if (hasWallet) {
      await this.prisma.pendingOperation.create({
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
      });
    }

    return { product, syncStatus: product.syncStatus };
  }

  async transferOffline(dto: TransferOfflineDto, jwtUser: JwtPayload) {
    // Identifica o remetente pelo JWT (nunca pelo corpo da requisição)
    const callerUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(jwtUser.privyDid ? [{ privyDid: jwtUser.privyDid }] : []),
          ...(jwtUser.walletAddress ? [{ walletAddress: jwtUser.walletAddress }] : []),
          { walletAddress: jwtUser.sub },
        ],
      },
      select: { walletAddress: true, privyDid: true, name: true },
    });
    if (!callerUser) throw new BadRequestException('Usuário não encontrado. Cadastre-se primeiro.');

    const fromAddr = callerUser.walletAddress ?? callerUser.privyDid ?? jwtUser.sub;
    const fromName = callerUser.name ?? '';

    const product = await this.prisma.product.findUnique({ where: { lotId: dto.lotId } });
    if (!product) throw new NotFoundException('Produção não encontrada');
    if (!product.active) throw new BadRequestException('Produção inativa');
    if (product.currentOwnerAddress !== fromAddr) {
      throw new BadRequestException('Você não é o responsável atual por esta produção');
    }

    const toAddr = dto.toAddress.toLowerCase();
    const toUser = await this.prisma.user.findUnique({
      where: { walletAddress: toAddr },
      select: { name: true },
    });
    const toName = toUser?.name ?? '';

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
              actor: fromAddr,
              action: 'TRANSFERRED',
              docHash: product.documentHash,
              fromAddress: fromAddr,
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
          userAddress: fromAddr,
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
