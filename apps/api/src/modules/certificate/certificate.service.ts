import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';

const GREEN      = '#c3e438';
const DARK       = '#1a2200';
const BODY_TEXT  = '#222222';
const MUTED      = '#777777';
const FIELD_BG   = '#f6f9ee';
const FOOTER_BG  = '#2d2d2d';

const ACTION_LABELS: Record<string, string> = {
  CREATED:     'Cadastro realizado',
  TRANSFERRED: 'Transferência de responsabilidade',
  DEACTIVATED: 'Produção desativada',
};

const TRACE_COLORS: Record<string, string> = {
  CREATED:     GREEN,
  TRANSFERRED: '#60a5fa',
  DEACTIVATED: '#f87171',
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
      // Dev: src/assets/ (via process.cwd())
      path.join(process.cwd(), 'src', 'assets', 'logo-selva.png'),
      // Prod: dist/assets/ (copied by nest-cli assets config)
      // __dirname = dist/modules/certificate → ../../ = dist/
      path.join(__dirname, '..', '..', 'assets', 'logo-selva.png'),
      // Prod fallback: dist/assets/ via process.cwd()
      path.join(process.cwd(), 'dist', 'assets', 'logo-selva.png'),
      // Absolute fallback from monorepo root
      path.join(process.cwd(), 'apps', 'api', 'src', 'assets', 'logo-selva.png'),
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
      const M = 48;

      // ── 1. White header with centered logo ─────────────────────────
      const HEADER_H = 108;
      doc.rect(0, 0, W, HEADER_H).fill('white');

      if (this.logoPath) {
        try {
          doc.image(this.logoPath, 0, 12, { fit: [W, 80], align: 'center', valign: 'center' });
        } catch {
          this.drawTextLogo(doc, W, 14);
        }
      } else {
        this.drawTextLogo(doc, W, 14);
      }

      // ── 2. Green band ───────────────────────────────────────────────
      const BAND_H = 28;
      doc.rect(0, HEADER_H, W, BAND_H).fill(GREEN);

      doc.fontSize(9.5).fillColor(DARK).font('Helvetica-Bold')
        .text('SELVA - AMAZONIC BLOCKCHAIN ECOSYSTEM', 0, HEADER_H + 9, { align: 'center', width: W });

      // ── 3. Body area ────────────────────────────────────────────────
      const FOOTER_H = 52;
      const BODY_Y = HEADER_H + BAND_H;
      const BODY_H = H - BODY_Y - FOOTER_H;
      doc.rect(0, BODY_Y, W, BODY_H).fill('white');

      // Watermark
      this.drawWatermark(doc, W, BODY_Y, BODY_H);

      let y = BODY_Y + 22;

      // Document title
      doc.fontSize(13.5).fillColor(DARK).font('Helvetica-Bold')
        .text('COMPROVANTE DE RASTREABILIDADE', 0, y, { align: 'center', width: W });
      y += 18;

      if (product.productName) {
        doc.fontSize(10).fillColor(MUTED).font('Helvetica')
          .text(product.productName, 0, y, { align: 'center', width: W });
        y += 16;
      }

      // Status badge (right-aligned)
      const badgeText = isOffline ? '  PENDENTE  ' : '  VERIFICADO  ';
      const badgeColor = isOffline ? '#f59e0b' : '#16a34a';
      const badgeBorder = isOffline ? '#fcd34d' : GREEN;
      doc.fontSize(7.5);
      const badgeTextW = doc.widthOfString(badgeText);
      const bx = W - M - badgeTextW - 8;
      doc.roundedRect(bx, y - 2, badgeTextW + 8, 16, 4)
        .lineWidth(1).strokeColor(badgeBorder).fillAndStroke(isOffline ? '#fef9c3' : '#f0f9e8');
      doc.fontSize(7.5).fillColor(badgeColor).font('Helvetica-Bold')
        .text(isOffline ? 'PENDENTE' : 'VERIFICADO', bx + 4, y + 2, { width: badgeTextW });

      y += 22;

      // Green separator
      doc.moveTo(M, y).lineTo(W - M, y).lineWidth(1.5).strokeColor(GREEN).stroke();
      y += 16;

      // ── Data fields (2-column grid) ─────────────────────────────────
      const dateStr = product.onChainAt
        ? new Date(product.onChainAt).toLocaleDateString('pt-BR')
        : '—';
      const unit = product.unit || 'KG';
      const volumeStr = `${Number(product.volume ?? 0).toLocaleString('pt-BR')} ${unit}`;
      const producerName = product.producerName || this.shortAddr(product.producerAddress);
      const ownerName = product.currentOwnerName || this.shortAddr(product.currentOwnerAddress);
      const priceStr = product.pricePerUnit != null
        ? `R$ ${Number(product.pricePerUnit).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/${unit}`
        : null;

      const fields: [string, string][] = [
        ['Código da produção', product.lotId],
        ['Produtor / Origem', producerName],
        ['Local de origem', product.origin || '—'],
        ['Quantidade produzida', volumeStr],
        ...(priceStr ? [['Preço por unidade', priceStr] as [string, string]] : []),
        ['Data de registro', dateStr],
        ['Responsável atual', ownerName],
      ];

      const GAP = 10;
      const FIELD_H = 38;
      const fieldW = (W - M * 2 - GAP) / 2;
      const startFieldY = y;

      fields.forEach(([label, value], idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const fx = M + col * (fieldW + GAP);
        const fy = startFieldY + row * (FIELD_H + 6);

        doc.roundedRect(fx, fy, fieldW, FIELD_H, 4).fill(FIELD_BG);
        doc.fontSize(7).fillColor(MUTED).font('Helvetica')
          .text(label.toUpperCase(), fx + 10, fy + 7, { width: fieldW - 20 });
        doc.fontSize(10).fillColor(BODY_TEXT).font('Helvetica-Bold')
          .text(value, fx + 10, fy + 18, { width: fieldW - 20, ellipsis: true });
      });

      y = startFieldY + Math.ceil(fields.length / 2) * (FIELD_H + 6) + 8;

      // Hash do documento — linha completa (valor longo)
      if (product.documentHash) {
        const fullW = W - M * 2;
        doc.roundedRect(M, y, fullW, FIELD_H, 4).fill(FIELD_BG);
        doc.fontSize(7).fillColor(MUTED).font('Helvetica')
          .text('HASH DO DOCUMENTO', M + 10, y + 7, { width: fullW - 20 });
        doc.fontSize(8.5).fillColor(BODY_TEXT).font('Courier')
          .text(product.documentHash, M + 10, y + 18, { width: fullW - 20, ellipsis: true });
        y += FIELD_H + 6;
      }

      y += 2;

      // ── History ─────────────────────────────────────────────────────
      doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor('#e0e0e0').stroke();
      y += 12;

      doc.fontSize(8.5).fillColor(DARK).font('Helvetica-Bold')
        .text('HISTÓRICO DA PRODUÇÃO', M, y);
      y += 14;

      for (const trace of traces) {
        const label   = ACTION_LABELS[trace.action] ?? trace.action;
        const dotClr  = TRACE_COLORS[trace.action] ?? MUTED;
        const dateVal = trace.blockTimestamp
          ? new Date(trace.blockTimestamp).toLocaleDateString('pt-BR')
          : '—';

        let text = label;
        if (trace.action === 'CREATED' && trace.toName) {
          text += ` por ${trace.toName}`;
        } else if (trace.action === 'TRANSFERRED') {
          text += `: ${trace.fromName || 'anterior'} → ${trace.toName || 'destinatário'}`;
        }

        const ROW_H = trace.txHash ? 28 : 22;
        doc.roundedRect(M, y, W - M * 2, ROW_H, 3).fill(FIELD_BG);

        // dot
        doc.circle(M + 12, y + ROW_H / 2, 4).fill(dotClr);

        doc.fontSize(8.5).fillColor(BODY_TEXT).font('Helvetica')
          .text(text, M + 22, y + (trace.txHash ? 4 : 7), { width: W - M * 2 - 100 });

        if (trace.txHash) {
          doc.fontSize(6.5).fillColor('#aaaaaa').font('Courier')
            .text(`tx: ${trace.txHash.slice(0, 22)}...`, M + 22, y + 16, { width: W - M * 2 - 100 });
        }

        doc.fontSize(8).fillColor(MUTED).font('Helvetica')
          .text(dateVal, W - M - 80, y + (ROW_H - 9) / 2, { width: 80, align: 'right' });

        y += ROW_H + 5;
      }

      // ── QR Code ─────────────────────────────────────────────────────
      y += 8;
      const QR_SIZE = 90;
      const qrX = (W - QR_SIZE) / 2;

      try {
        const qrBuf = await QRCode.toBuffer(publicUrl, {
          width: QR_SIZE * 4, margin: 1,
          color: { dark: '#1a2200', light: '#ffffff' },
        });
        doc.image(qrBuf, qrX, y, { width: QR_SIZE, height: QR_SIZE });
      } catch {}

      doc.fontSize(7.5).fillColor(MUTED).font('Helvetica')
        .text('Escaneie para verificar autenticidade', 0, y + QR_SIZE + 4, { align: 'center', width: W });
      doc.fontSize(7).fillColor(MUTED).font('Helvetica')
        .text(publicUrl, 0, y + QR_SIZE + 14, { align: 'center', width: W });

      // Technical mini-line
      const techY = y + QR_SIZE + 28;
      doc.fontSize(6.5).fillColor('#bbbbbb').font('Helvetica')
        .text(
          `ID: ${product.lotId}  ·  Hash: ${product.documentHash ? product.documentHash.slice(0, 18) + '…' : '—'}  ·  Rede: Polygon Amoy (chainId 80002)`,
          0, techY, { align: 'center', width: W },
        );

      if (isOffline) {
        doc.fontSize(7.5).fillColor('#b45309').font('Helvetica-Bold')
          .text('⚠  Registro digital pendente — sincronização em processamento', 0, techY + 12, { align: 'center', width: W });
      }

      // ── Footer ──────────────────────────────────────────────────────
      const FY = H - FOOTER_H;
      doc.rect(0, FY, W, FOOTER_H).fill(FOOTER_BG);

      const fy2 = FY + 16;
      doc.fontSize(8.5).fillColor(GREEN).font('Helvetica')
        .text('selva.eco.br', M, fy2);
      doc.fontSize(8.5).fillColor(GREEN).font('Helvetica')
        .text('selva.eco', 0, fy2, { align: 'center', width: W });
      doc.fontSize(8.5).fillColor(GREEN).font('Helvetica')
        .text('+55 (92) 98468-1214', 0, fy2, { align: 'right', width: W - M });

      doc.fontSize(7).fillColor('rgba(255,255,255,0.35)').font('Helvetica')
        .text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, 0, FY + 34, { align: 'center', width: W });

      doc.end();
    });
  }

  private drawTextLogo(doc: any, W: number, y: number) {
    // Fallback: draw text-only logo centered
    doc.fontSize(20).fillColor(DARK).font('Helvetica-Bold')
      .text('SELVA', 0, y + 16, { align: 'center', width: W });
    doc.fontSize(7.5).fillColor(MUTED).font('Helvetica')
      .text('AMAZONIC BLOCKCHAIN ECOSYSTEM', 0, y + 40, { align: 'center', width: W });
  }

  private drawWatermark(doc: any, W: number, bodyY: number, bodyH: number) {
    doc.save();
    doc.opacity(0.035);

    const cx = W / 2;
    const cy = bodyY + bodyH * 0.5;

    // Concentric circles
    for (let r = 50; r <= 230; r += 55) {
      doc.circle(cx, cy, r).lineWidth(1.5).stroke(DARK);
    }

    // Offset accent circles
    doc.circle(cx - 170, cy + 70, 85).lineWidth(1).stroke(DARK);
    doc.circle(cx + 170, cy - 70, 85).lineWidth(1).stroke(DARK);
    doc.circle(cx - 80, cy - 150, 50).lineWidth(1).stroke(DARK);
    doc.circle(cx + 100, cy + 150, 50).lineWidth(1).stroke(DARK);

    // Connecting lines (blockchain nodes)
    doc.moveTo(cx, cy - 230).lineTo(cx - 170, cy + 70).lineWidth(0.8).stroke(DARK);
    doc.moveTo(cx, cy - 230).lineTo(cx + 170, cy - 70).lineWidth(0.8).stroke(DARK);
    doc.moveTo(cx - 170, cy + 70).lineTo(cx + 170, cy - 70).lineWidth(0.8).stroke(DARK);

    doc.restore();
  }

  private shortAddr(addr?: string): string {
    if (!addr) return '—';
    return addr.length > 20 ? addr.slice(0, 10) + '...' + addr.slice(-6) : addr;
  }
}
