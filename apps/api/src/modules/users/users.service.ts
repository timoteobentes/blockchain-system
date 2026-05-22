import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserQueryDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UserQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { onChainAt: 'desc' },
        select: { id: true, userHash: true, name: true, walletAddress: true, isProducer: true, onChainAt: true },
      }),
      this.prisma.user.count(),
    ]);
    return { data, total, page, limit };
  }

  async findByAddress(address: string) {
    const user = await this.prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
      select: { id: true, userHash: true, name: true, walletAddress: true, isProducer: true, onChainAt: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }
}
