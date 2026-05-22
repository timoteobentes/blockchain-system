import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { IndexerService } from './indexer.service';

@Module({
  providers: [BlockchainService, IndexerService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
