import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';

const GREEN = '#c3e438';
const DARK = '#1a2200';
const GRAY = '#555555';
const LIGHT_GRAY = '#f5f5f5';

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Cadastro realizado',
  TRANSFERRED: 'Transferência de responsabilidade',
  DEACTIVATED: 'Produção desativada',
};

const ORIGIN_LABELS: Record<string, string> = {
  PESSOA: 'Pessoa física',
  ASSOCIACAO: 'Associação',
  COMUNIDADE: 'Comunidade',
};

@Injectable()
export class CertificateService {
  private readonly contractAddress: string;
  private readonly appUrl: string;
  private readonly logoPath: string;

  constructor(private readonly config: ConfigService) {
    this.contractAddress = config.get<string>('CONTRACT_ADDRESS', '');
    this.appUrl = config.get<string>('APP_URL', 'http://localhost:3000');

    const candidates = [
      path.join(process.cwd(), 'src', 'assets', 'logo-selva.png'),
      path.join(__dirname, '..', 'assets', 'logo-selva.png'),
    ];
    this.logoPath = candidates.find(p => fs.existsSync(p)) ?? '';
  }

  async generate(product: any, traces: any[]): Promise<Buffer> {
    const isOffline = traces.some(t => !t.txHash) || product.syncStatus === 'PENDING';
    const publicUrl = `${this.appUrl}/p/${product.lotId}`;

    return new Promise(async (resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = 595.28;
      const H = 841.89;
      const M = 40; // margin

      // ── Header ───────────────────────────────────────────────────
      doc.rect(0, 0, W, 90).fill(DARK);

      if (this.logoPath) {
        try { doc.image(this.logoPath, M, 12, { height: 66 }); } catch {}
      }

      doc.fontSize(18).fillColor(GREEN).font('Helvetica-Bold')
        .text('SELVA', M + 76, 24);
      doc.fontSize(9).fillColor('white').font('Helvetica')
        .text('Sistema de Rastreabilidade Amazônica', M + 76, 46)
        .text('selva.eco.br', M + 76, 60);

      // Status badge
      const badgeText = isOffline ? 'PENDENTE' : 'VERIFICADO';
      const badgeColor = isOffline ? '#fbbf24' : GREEN;
      doc.fontSize(8).fillColor(badgeColor).font('Helvetica-Bold')
        .text(badgeText, W - M - 80, 38, { width: 80, align: 'right' });

      // ── Body background ───────────────────────────────────────────
      doc.rect(0, 90, W, H - 130).fill('white');

      // ── Title ─────────────────────────────────────────────────────
      doc.fontSize(14).fillColor(DARK).font('Helvetica-Bold')
        .text('COMPROVANTE DE RASTREABILIDADE', M, 108, { align: 'center', width: W - M * 2 });

      doc.moveTo(M, 130).lineTo(W - M, 130).lineWidth(0.5).strokeColor(GREEN).stroke();

      // ── Dados principais ──────────────────────────────────────────
      let y = 142;

      const row = (label: string, value: string, yPos: number) => {
        doc.fontSize(8.5).fillColor(GRAY).font('Helvetica').text(label + ':', M, yPos);
        doc.fontSize(9.5).fillColor(DARK).font('Helvetica-Bold').text(value, M + 130, yPos - 1, { width: W - M * 2 - 130 });
      };

      const producerName = product.producerName || product.producerAddress?.slice(0, 10) + '...';
      const ownerName = product.currentOwnerName || product.currentOwnerAddress?.slice(0, 10) + '...';
      const originTypeLabel = ORIGIN_LABELS[product.originType] ?? 'Pessoa física';
      const dateStr = product.onChainAt ? new Date(product.onChainAt).toLocaleDateString('pt-BR') : '—';
      const volumeStr = `${product.volume?.toLocaleString('pt-BR')} litros`;

      row('Produtor / Origem', producerName, y); y += 18;
      row('Tipo de cadastro', originTypeLabel, y); y += 18;
      row('Local de origem', product.origin, y); y += 18;
      row('Código da produção', product.lotId, y); y += 18;
      row('Volume', volumeStr, y); y += 18;
      row('Data de registro', dateStr, y); y += 18;
      row('Responsável atual', ownerName, y); y += 18;

      // ── Histórico ─────────────────────────────────────────────────
      y += 6;
      doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.3).strokeColor('#dddddd').stroke();
      y += 10;

      doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold')
        .text('HISTÓRICO DA PRODUÇÃO', M, y);
      y += 14;

      for (const trace of traces) {
        const label = ACTION_LABELS[trace.action] ?? trace.action;
        const traceDate = trace.blockTimestamp
          ? new Date(trace.blockTimestamp).toLocaleDateString('pt-BR')
          : '—';

        let traceText = label;
        if (trace.action === 'CREATED' && trace.toName) {
          traceText += ` por ${trace.toName}`;
        } else if (trace.action === 'TRANSFERRED') {
          const from = trace.fromName || 'anterior';
          const to = trace.toName || 'destinatário';
          traceText += `: ${from} → ${to}`;
        }

        doc.rect(M, y, W - M * 2, 18).fill(LIGHT_GRAY);
        doc.fontSize(8).fillColor(DARK).font('Helvetica')
          .text(`● ${traceText}`, M + 6, y + 5, { width: W - M * 2 - 80 });
        doc.fontSize(8).fillColor(GRAY).font('Helvetica')
          .text(traceDate, W - M - 60, y + 5, { width: 60, align: 'right' });
        y += 22;
      }

      // ── QR Code ───────────────────────────────────────────────────
      y += 10;
      const QR_SIZE = 130;
      const qrX = (W - QR_SIZE) / 2;

      try {
        const qrBuf = await QRCode.toBuffer(publicUrl, {
          width: QR_SIZE, margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });
        doc.image(qrBuf, qrX, y, { width: QR_SIZE, height: QR_SIZE });
      } catch {}

      doc.fontSize(8.5).fillColor(GRAY).font('Helvetica')
        .text('Escaneie para verificar a autenticidade', 0, y + QR_SIZE + 4, { align: 'center', width: W });

      // ── Informações Técnicas ───────────────────────────────────────
      const techY = y + QR_SIZE + 22;
      doc.moveTo(M, techY).lineTo(W - M, techY).lineWidth(0.3).strokeColor('#dddddd').stroke();

      doc.fontSize(7.5).fillColor(GRAY).font('Helvetica-Bold')
        .text('INFORMAÇÕES TÉCNICAS', M, techY + 6);

      doc.fontSize(7).fillColor(GRAY).font('Helvetica')
        .text(`ID do lote: ${product.lotId}`, M, techY + 18)
        .text(`Hash do doc.: ${product.documentHash ? product.documentHash.slice(0, 30) + '...' : '—'}`, M, techY + 28)
        .text(`Contrato: ${this.contractAddress || '(não deployado)'}`, M, techY + 38)
        .text('Rede: Polygon Amoy (chainId 80002)', M, techY + 48);

      if (isOffline) {
        doc.fontSize(7.5).fillColor('#cc4400').font('Helvetica-Bold')
          .text('⚠  Registro digital pendente — sincronização em processamento', M, techY + 60);
      }

      // ── Footer ────────────────────────────────────────────────────
      doc.rect(0, H - 40, W, 40).fill(DARK);
      doc.fontSize(8).fillColor(GREEN).font('Helvetica')
        .text('selva.eco.br', M, H - 27)
        .text('@selva.eco', W / 2 - 30, H - 27, { width: 80, align: 'center' })
        .text('+55 92 9 9264 3800', W - M - 110, H - 27, { width: 110, align: 'right' });

      doc.fontSize(7).fillColor('rgba(255,255,255,0.4)').font('Helvetica')
        .text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, 0, H - 16, { align: 'center', width: W });

      doc.end();
    });
  }
}
