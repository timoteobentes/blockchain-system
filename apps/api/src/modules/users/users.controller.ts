import { Controller, Get, Patch, Param, Query, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserQueryDto, UpdateProfileDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lista todos os usuários registrados' })
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Perfil completo do usuário autenticado' })
  async me(@CurrentUser() user: JwtPayload) {
    const dbUser = await this.usersService.findMe(user);
    return { ...dbUser, isAdmin: user.isAdmin };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualiza o perfil do usuário autenticado' })
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    const updated = await this.usersService.updateProfile(user, dto);
    return { ...updated, isAdmin: user.isAdmin };
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Busca usuário pelo CPF para transferência de produção' })
  lookup(@Query('cpf') cpf: string) {
    if (!cpf) throw new BadRequestException('CPF é obrigatório');
    return this.usersService.findByCpf(cpf);
  }

  @Get(':address')
  @ApiOperation({ summary: 'Detalhes de um usuário pelo endereço' })
  findOne(@Param('address') address: string) {
    return this.usersService.findByAddress(address);
  }
}
