import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  async findByCpf(cpf: string) {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) throw new BadRequestException('CPF inválido');
    const formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ cpf: formatted }, { cpf: digits }] },
      select: { name: true, walletAddress: true, isProducer: true },
    });
    if (!user) throw new NotFoundException('Nenhum produtor encontrado com este CPF. Verifique se ele está cadastrado no sistema.');
    return user;
  }
}
