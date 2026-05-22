import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';

const SELVA_GREEN_LIGHT = '#d0e896';
const SELVA_GREEN_DARK = '#2d4a0e';
const SELVA_GRAY = '#555555';
const POLYGONSCAN_BASE = 'https://amoy.polygonscan.com';

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Cadastro do Produto',
  TRANSFERRED: 'Transferência de Custódia',
  DEACTIVATED: 'Desativação do Lote',
};

@Injectable()
export class CertificateService {
  private readonly contractAddress: string;
  private readonly logoPath: string;

  constructor(private readonly config: ConfigService) {
    this.contractAddress = config.get<string>('CONTRACT_ADDRESS', '');
    // resolve logo relative to project cwd (apps/api/)
    const candidates = [
      path.join(process.cwd(), 'src', 'assets', 'logo-selva.png'),
      path.join(__dirname, '..', 'assets', 'logo-selva.png'),
      path.join(process.cwd(), 'dist', 'assets', 'logo-selva.png'),
    ];
    this.logoPath = candidates.find(p => fs.existsSync(p)) ?? '';
  }

  async generate(product: any, traces: any[]): Promise<Buffer> {
    const isOffline = traces.some(t => !t.txHash) || product.syncStatus === 'PENDING';

    return new Promise(async (resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 0 });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = 595.28;
      const H = 841.89;

      // ── Header background ─────────────────────────────────────────
      doc.rect(0, 0, W, 120).fill(SELVA_GREEN_LIGHT);

      // Logo
      if (this.logoPath) {
        try {
          doc.image(this.logoPath, W / 2 - 40, 12, { width: 80, height: 80 });
        } catch {}
      }

      // Title bar
      doc.rect(0, 100, W, 28).fill(SELVA_GREEN_DARK);
      doc.fontSize(11).fillColor('white').font('Helvetica-Bold')
        .text('SELVA  —  AMAZONIC BLOCKCHAIN ECOSYSTEM', 0, 108, { align: 'center' });

      // ── Body ──────────────────────────────────────────────────────
      doc.rect(0, 128, W, H - 128).fill('white');

      // Offline watermark
      if (isOffline) {
        doc.save();
        doc.rotate(-40, { origin: [W / 2, H / 2] });
        doc.fontSize(52).fillColor('#ff000015').font('Helvetica-Bold')
          .text('PENDENTE', W / 2 - 160, H / 2 - 30, { width: 320, align: 'center' });
        doc.restore();
      }

      // Certificate title
      doc.fontSize(15).fillColor(SELVA_GREEN_DARK).font('Helvetica-Bold')
        .text('CERTIFICADO DE RASTREABILIDADE', 0, 148, { align: 'center' });

      // Product ID & Doc Hash
      const shortId = product.lotId;
      const docHash = product.documentHash ?? '—';
      doc.fontSize(9).fillColor(SELVA_GRAY).font('Helvetica')
        .text(`IDº (Lote): ${shortId}`, 40, 175)
        .text(`Contrato: ${this.contractAddress || '(não deployado)'}`, 40, 190)
        .text(`HASHCODE (SHA-256 doc): ${docHash}`, 40, 205);

      if (isOffline) {
        doc.fontSize(8).fillColor('#cc4400').font('Helvetica-Bold')
          .text('⚠  Modo offline — sincronização com blockchain pendente', 40, 220);
      }

      // ── QR codes ─────────────────────────────────────────────────
      const qrEntries = await this.buildQrEntries(product, traces);
      const QR_SIZE = 115;
      const COL_W = (W - 80) / 2;
      let qrY = isOffline ? 242 : 232;

      for (let i = 0; i < qrEntries.length; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 40 + col * (COL_W + 0);
        const y = qrY + row * (QR_SIZE + 38);

        const { label, url } = qrEntries[i];

        try {
          const qrBuf = await QRCode.toBuffer(url, { width: QR_SIZE, margin: 1, color: { dark: '#000', light: '#fff' } });
          doc.image(qrBuf, x, y + 18, { width: QR_SIZE, height: QR_SIZE });
        } catch {}

        doc.fontSize(8).fillColor(SELVA_GRAY).font('Helvetica-Bold')
          .text(label, x, y, { width: QR_SIZE + 60 });

        if (!qrEntries[i].url.includes('polygonscan')) {
          doc.fontSize(7).fillColor('#cc4400').font('Helvetica')
            .text('⏳ Aguardando confirmação na blockchain', x, y + QR_SIZE + 20, { width: QR_SIZE + 20 });
        }
      }

      // ── Polygonscan link ─────────────────────────────────────────
      const rows = Math.ceil(qrEntries.length / 2);
      const linkY = qrY + rows * (QR_SIZE + 38) + 10;
      const contractUrl = this.contractAddress
        ? `${POLYGONSCAN_BASE}/address/${this.contractAddress}`
        : '';

      if (contractUrl) {
        doc.fontSize(8).fillColor(SELVA_GRAY).font('Helvetica')
          .text('Link de consulta do contrato:', 40, linkY);
        doc.fontSize(8).fillColor('#0066cc').font('Helvetica')
          .text(contractUrl, 40, linkY + 12, { link: contractUrl, underline: true });
      }

      // ── Footer ────────────────────────────────────────────────────
      const footerY = H - 42;
      doc.rect(0, footerY, W, 42).fill(SELVA_GREEN_LIGHT);
      doc.fontSize(9).fillColor(SELVA_GREEN_DARK).font('Helvetica')
        .text('✉  selva.eco.br', 40, footerY + 14)
        .text('📷  selva.eco', W / 2 - 30, footerY + 14, { align: 'center', width: 120 })
        .text('📞  +55 92 9 9264 3800', W - 160, footerY + 14);

      // Generation date
      doc.fontSize(7).fillColor(SELVA_GRAY).font('Helvetica')
        .text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, 0, footerY + 28, { align: 'center' });

      doc.end();
    });
  }

  private async buildQrEntries(product: any, traces: any[]): Promise<{ label: string; url: string }[]> {
    const entries: { label: string; url: string }[] = [];

    // 1. Contract entry (always)
    const contractUrl = this.contractAddress
      ? `${POLYGONSCAN_BASE}/address/${this.contractAddress}`
      : `https://selva.eco.br/products/${product.lotId}`;
    entries.push({ label: 'Implementação do Contrato', url: contractUrl });

    // 2. Each trace event dynamically
    for (const trace of traces) {
      const label = this.traceLabel(trace, entries.filter(e => e.label.startsWith('Transferência')).length);
      const url = trace.txHash
        ? `${POLYGONSCAN_BASE}/tx/${trace.txHash}`
        : `https://selva.eco.br/products/${product.lotId}`;
      entries.push({ label, url });
    }

    return entries;
  }

  private traceLabel(trace: any, transferCount: number): string {
    if (trace.action === 'TRANSFERRED') {
      return `Transferência de Custódia${transferCount > 0 ? ` (${transferCount + 1})` : ''}`;
    }
    return ACTION_LABELS[trace.action] ?? trace.action;
  }
}
