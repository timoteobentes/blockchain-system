import { Controller, Get, Delete, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CertificateService } from '../certificate/certificate.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly certificateService: CertificateService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista lotes com filtros opcionais' })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':lotId')
  @ApiOperation({ summary: 'Detalhes de um lote' })
  findOne(@Param('lotId') lotId: string) {
    return this.productsService.findOne(lotId);
  }

  @Get(':lotId/history')
  @ApiOperation({ summary: 'Histórico completo de rastreabilidade de um lote' })
  history(@Param('lotId') lotId: string) {
    return this.productsService.getHistory(lotId);
  }

  @Get(':lotId/certificate')
  @ApiOperation({ summary: 'Gera o Certificado de Rastreabilidade em PDF' })
  async certificate(@Param('lotId') lotId: string, @Res() res: Response) {
    const [product, traces] = await Promise.all([
      this.productsService.findOne(lotId),
      this.productsService.getHistory(lotId),
    ]);

    const pdfBuffer = await this.certificateService.generate(product, traces);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="SELVA-Certificado-${lotId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Delete(':lotId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Desativa um lote (admin only)' })
  deactivate(@Param('lotId') lotId: string) {
    return this.productsService.deactivate(lotId);
  }
}
