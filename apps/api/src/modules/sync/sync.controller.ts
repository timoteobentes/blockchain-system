import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { RegisterUserOfflineDto, AddProductOfflineDto, TransferOfflineDto, ConfirmSyncDto } from './dto/sync.dto';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('status')
  @ApiOperation({ summary: 'Status do blockchain e contagem de operações pendentes' })
  getStatus() {
    return this.syncService.getStatus();
  }

  @Get('pending')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lista operações pendentes de sincronização do usuário autenticado' })
  getPending(@CurrentUser() user: JwtPayload) {
    return this.syncService.getPendingForUser(user.sub);
  }

  @Post('register')
  @ApiOperation({ summary: 'Registrar usuário no banco (modo offline)' })
  registerOffline(@Body() dto: RegisterUserOfflineDto) {
    return this.syncService.registerUserOffline(dto);
  }

  @Post('product')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Registrar produto no banco (modo offline)' })
  addProductOffline(@Body() dto: AddProductOfflineDto) {
    return this.syncService.addProductOffline(dto);
  }

  @Post('transfer')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Registrar transferência no banco (modo offline)' })
  transferOffline(@Body() dto: TransferOfflineDto) {
    return this.syncService.transferOffline(dto);
  }

  @Patch('confirm/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Confirmar sincronização de operação pendente com txHash' })
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmSyncDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.syncService.confirmSync(id, dto.txHash, user.sub);
  }
}
