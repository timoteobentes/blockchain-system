import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProducersModule } from './modules/producers/producers.module';
import { ProductsModule } from './modules/products/products.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProducersModule,
    ProductsModule,
    BlockchainModule,
    SyncModule,
  ],
})
export class AppModule {}
