import { Controller, Get, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

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

  @Delete(':lotId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Desativa um lote (admin only)' })
  deactivate(@Param('lotId') lotId: string) {
    return this.productsService.deactivate(lotId);
  }
}
