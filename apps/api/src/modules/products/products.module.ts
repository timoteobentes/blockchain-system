import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { CertificateModule } from '../certificate/certificate.module';

@Module({
  imports: [BlockchainModule, CertificateModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
