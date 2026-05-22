import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, Contract } from 'ethers';
import SELVA_ABI from '../../../../../packages/types/src/abis/SELVATraceability.json';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private adminWallet: ethers.Wallet;
  private contract: Contract;         // read + write (admin signer)
  private readContract: Contract;     // read-only

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const rpc = this.config.get<string>('POLYGON_AMOY_RPC');
    const privateKey = this.config.get<string>('ADMIN_PRIVATE_KEY');
    const contractAddress = this.config.get<string>('CONTRACT_ADDRESS');

    if (!rpc || !contractAddress) {
      this.logger.warn('POLYGON_AMOY_RPC ou CONTRACT_ADDRESS não configurados — BlockchainService desabilitado');
      return;
    }

    this.provider = new ethers.JsonRpcProvider(rpc);
    this.readContract = new Contract(contractAddress, SELVA_ABI, this.provider);

    if (privateKey) {
      this.adminWallet = new ethers.Wallet(privateKey, this.provider);
      this.contract = new Contract(contractAddress, SELVA_ABI, this.adminWallet);
      this.logger.log(`BlockchainService iniciado. Admin: ${this.adminWallet.address}`);
    } else {
      this.logger.warn('ADMIN_PRIVATE_KEY não configurada — operações de escrita indisponíveis');
    }
  }

  getProvider() { return this.provider; }
  getReadContract() { return this.readContract; }
  isReady() { return !!this.readContract; }

  async getCurrentBlock(): Promise<bigint> {
    return BigInt(await this.provider.getBlockNumber());
  }

  // ── Admin write operations ────────────────────────────────────────────

  async makeProducer(userAddress: string): Promise<string> {
    const tx = await this.contract.makeProducer(userAddress);
    await tx.wait();
    this.logger.log(`makeProducer(${userAddress}) → tx ${tx.hash}`);
    return tx.hash;
  }

  async deactivateProduct(lotId: string): Promise<string> {
    const tx = await this.contract.deactivateProduct(lotId);
    await tx.wait();
    this.logger.log(`deactivateProduct(${lotId}) → tx ${tx.hash}`);
    return tx.hash;
  }

  // ── Read operations ──────────────────────────────────────────────────

  async getUser(userHash: string) {
    return this.readContract.getUser(userHash);
  }

  async getProduct(lotId: string) {
    return this.readContract.getProduct(lotId);
  }

  async isProducer(address: string): Promise<boolean> {
    return this.readContract.isProducer(address);
  }

  async queryEvents(eventName: string, fromBlock: bigint, toBlock: bigint) {
    const filter = this.readContract.filters[eventName]();
    return this.readContract.queryFilter(filter, fromBlock, toBlock);
  }
}
