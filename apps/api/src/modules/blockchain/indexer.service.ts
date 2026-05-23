import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ethers } from 'ethers';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainService } from './blockchain.service';

const CHUNK_SIZE = 2000n;

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async sync() {
    if (!this.blockchain.isReady() || this.running) return;
    this.running = true;
    try {
      await this.runSync();
    } catch (err) {
      this.logger.error('Erro na sincronização', err);
    } finally {
      this.running = false;
    }
  }

  private async runSync() {
    const state = await this.prisma.syncState.upsert({
      where: { id: 1 },
      create: { id: 1, lastBlock: 0n },
      update: {},
    });

    const currentBlock = await this.blockchain.getCurrentBlock();
    let fromBlock = state.lastBlock + 1n;

    if (fromBlock > currentBlock) return;

    this.logger.debug(`Sincronizando blocos ${fromBlock} → ${currentBlock}`);

    while (fromBlock <= currentBlock) {
      const toBlock = fromBlock + CHUNK_SIZE - 1n < currentBlock ? fromBlock + CHUNK_SIZE - 1n : currentBlock;
      await this.processChunk(fromBlock, toBlock);
      fromBlock = toBlock + 1n;
    }

    await this.prisma.syncState.update({ where: { id: 1 }, data: { lastBlock: currentBlock } });
    this.logger.debug(`Sync concluído. Último bloco: ${currentBlock}`);
  }

  private async processChunk(fromBlock: bigint, toBlock: bigint) {
    const [userEvents, producerEvents, productEvents, transferEvents] = await Promise.all([
      this.blockchain.queryEvents('UserRegistered', fromBlock, toBlock),
      this.blockchain.queryEvents('ProducerCreated', fromBlock, toBlock),
      this.blockchain.queryEvents('ProductAdded', fromBlock, toBlock),
      this.blockchain.queryEvents('OwnershipTransferred', fromBlock, toBlock),
    ]);

    for (const evt of userEvents) await this.handleUserRegistered(evt);
    for (const evt of producerEvents) await this.handleProducerCreated(evt);
    for (const evt of productEvents) await this.handleProductAdded(evt);
    for (const evt of transferEvents) await this.handleOwnershipTransferred(evt);
  }

  private async handleUserRegistered(evt: any) {
    try {
      const userHash: string = evt.args.userHash;
      const userAddress: string = evt.args.userAddress;
      const [name, cpf, , createdAt] = await this.blockchain.getUser(userHash);

      await this.prisma.user.upsert({
        where: { userHash },
        create: {
          userHash,
          name,
          cpf,
          walletAddress: userAddress.toLowerCase(),
          onChainAt: new Date(Number(createdAt) * 1000),
        },
        update: { name, cpf, walletAddress: userAddress.toLowerCase() },
      });
      this.logger.log(`UserRegistered: ${name} (${userAddress})`);
    } catch (err) {
      this.logger.error('handleUserRegistered falhou', err);
    }
  }

  private async handleProducerCreated(evt: any) {
    try {
      const address: string = evt.args.producerAddress;
      await this.prisma.user.updateMany({
        where: { walletAddress: address.toLowerCase() },
        data: { isProducer: true },
      });
      this.logger.log(`ProducerCreated: ${address}`);
    } catch (err) {
      this.logger.error('handleProducerCreated falhou', err);
    }
  }

  private async handleProductAdded(evt: any) {
    try {
      const lotId: string = evt.args.lotId;
      const [, volume, origin, producer, currentOwner, documentHash, createdAt] =
        await this.blockchain.getProduct(lotId);

      // Buscar nome do produtor pelo endereço
      const producerUser = await this.prisma.user.findUnique({
        where: { walletAddress: producer.toLowerCase() },
        select: { name: true },
      });
      const producerName = producerUser?.name ?? '';

      const product = await this.prisma.product.upsert({
        where: { lotId },
        create: {
          lotId,
          volume: Number(volume),
          origin,
          originType: 'PESSOA',
          producerAddress: producer.toLowerCase(),
          producerName,
          currentOwnerAddress: currentOwner.toLowerCase(),
          currentOwnerName: producerName,
          documentHash,
          active: true,
          onChainAt: new Date(Number(createdAt) * 1000),
        },
        update: { volume: Number(volume), origin, active: true },
      });

      const block = await evt.getBlock();
      await this.prisma.trace.upsert({
        where: { id: `${lotId}-CREATED` },
        create: {
          id: `${lotId}-CREATED`,
          productId: product.id,
          actor: producer.toLowerCase(),
          action: 'CREATED',
          docHash: documentHash,
          fromAddress: ethers.ZeroAddress,
          toAddress: producer.toLowerCase(),
          fromName: '',
          toName: producerName,
          blockTimestamp: new Date(block.timestamp * 1000),
          txHash: evt.transactionHash,
          blockNumber: BigInt(evt.blockNumber),
        },
        update: {},
      });
      this.logger.log(`ProductAdded: ${lotId} — ${producerName}`);
    } catch (err) {
      this.logger.error('handleProductAdded falhou', err);
    }
  }

  private async handleOwnershipTransferred(evt: any) {
    try {
      const lotId: string = evt.args.lotId;
      const from: string = evt.args.from;
      const to: string = evt.args.to;
      const block = await evt.getBlock();

      // Buscar nomes dos envolvidos
      const [fromUser, toUser] = await Promise.all([
        this.prisma.user.findUnique({ where: { walletAddress: from.toLowerCase() }, select: { name: true } }),
        this.prisma.user.findUnique({ where: { walletAddress: to.toLowerCase() }, select: { name: true } }),
      ]);
      const fromName = fromUser?.name ?? '';
      const toName = toUser?.name ?? '';

      const product = await this.prisma.product.update({
        where: { lotId },
        data: {
          currentOwnerAddress: to.toLowerCase(),
          currentOwnerName: toName,
        },
      });

      const traceId = `${lotId}-TRANSFERRED-${evt.transactionHash}`;
      await this.prisma.trace.upsert({
        where: { id: traceId },
        create: {
          id: traceId,
          productId: product.id,
          actor: from.toLowerCase(),
          action: 'TRANSFERRED',
          docHash: product.documentHash,
          fromAddress: from.toLowerCase(),
          toAddress: to.toLowerCase(),
          fromName,
          toName,
          blockTimestamp: new Date(block.timestamp * 1000),
          txHash: evt.transactionHash,
          blockNumber: BigInt(evt.blockNumber),
        },
        update: {},
      });
      this.logger.log(`OwnershipTransferred: ${lotId} → ${toName || to}`);
    } catch (err) {
      this.logger.error('handleOwnershipTransferred falhou', err);
    }
  }
}
