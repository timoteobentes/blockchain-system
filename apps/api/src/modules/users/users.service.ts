import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth/decorators/current-user.decorator';
import { UserQueryDto, UpdateProfileDto } from './dto/user.dto';

const PROFILE_SELECT = {
  id: true,
  userHash: true,
  name: true,
  walletAddress: true,
  privyDid: true,
  email: true,
  cpf: true,
  isProducer: true,
  isAdmin: true,
  onChainAt: true,
  syncStatus: true,
  phone: true,
  phone2: true,
  street: true,
  addressNumber: true,
  complement: true,
  neighborhood: true,
  city: true,
  state: true,
  zipCode: true,
  assocName: true,
  assocCnpj: true,
  assocRole: true,
  landSizeHa: true,
  landType: true,
  bio: true,
} as const;

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
        orderBy: { syncedAt: 'desc' },
        select: { id: true, userHash: true, name: true, walletAddress: true, privyDid: true, email: true, isProducer: true, onChainAt: true },
      }),
      this.prisma.user.count(),
    ]);
    return { data, total, page, limit };
  }

  async findMe(jwtUser: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(jwtUser.privyDid ? [{ privyDid: jwtUser.privyDid }] : []),
          ...(jwtUser.walletAddress ? [{ walletAddress: jwtUser.walletAddress }] : []),
          { walletAddress: jwtUser.sub },
        ],
      },
      select: PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async updateProfile(jwtUser: JwtPayload, dto: UpdateProfileDto) {
    const user = await this.findMe(jwtUser);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: dto,
      select: PROFILE_SELECT,
    });
    return updated;
  }

  async findByAddress(address: string) {
    const user = await this.prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
      select: { id: true, userHash: true, name: true, walletAddress: true, privyDid: true, isProducer: true, onChainAt: true },
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
