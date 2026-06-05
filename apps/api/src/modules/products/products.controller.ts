import { Controller, Get, Delete, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { CertificateService } from '../certificate/certificate.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly certificateService: CertificateService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista produções com filtros opcionais' })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lista produções do produtor autenticado' })
  findMine(@CurrentUser() user: JwtPayload, @Query() query: ProductQueryDto) {
    return this.productsService.findMine(user, query);
  }

  @Get(':lotId/public')
  @ApiOperation({ summary: 'Dados públicos de uma produção (sem autenticação)' })
  findPublic(@Param('lotId') lotId: string) {
    return this.productsService.findPublic(lotId);
  }

  @Get(':lotId/history')
  @ApiOperation({ summary: 'Histórico completo de rastreabilidade de uma produção' })
  history(@Param('lotId') lotId: string) {
    return this.productsService.getHistory(lotId);
  }

  @Get(':lotId/certificate')
  @ApiOperation({ summary: 'Gera o Comprovante de Rastreabilidade em PDF' })
  async certificate(@Param('lotId') lotId: string, @Res() res: Response) {
    const [product, traces] = await Promise.all([
      this.productsService.findOne(lotId),
      this.productsService.getHistory(lotId),
    ]);

    const pdfBuffer = await this.certificateService.generate(product, traces);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="SELVA-Comprovante-${lotId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get(':lotId')
  @ApiOperation({ summary: 'Detalhes de uma produção' })
  findOne(@Param('lotId') lotId: string) {
    return this.productsService.findOne(lotId);
  }

  @Delete(':lotId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Desativa uma produção (admin only)' })
  deactivate(@Param('lotId') lotId: string) {
    return this.productsService.deactivate(lotId);
  }
}
