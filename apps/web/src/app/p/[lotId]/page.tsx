/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Cadastrado',
  TRANSFERRED: 'Transferido',
  DEACTIVATED: 'Desativado',
};

const ORIGIN_LABELS: Record<string, string> = {
  PESSOA: 'Pessoa física',
  ASSOCIACAO: 'Associação',
  COMUNIDADE: 'Comunidade',
};

async function fetchProduct(lotId: string) {
  try {
    const res = await fetch(`${API_URL}/api/products/${lotId}/public`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ lotId: string }> }): Promise<Metadata> {
  const { lotId } = await params;
  const product = await fetchProduct(lotId);
  if (!product) return { title: 'Produção não encontrada — SELVA' };

  const desc = `Produção de ${product.producerName || 'produtor'} em ${product.origin}. ${product.volume} litros.`;
  return {
    title: `${product.lotId} — Comprovante SELVA`,
    description: desc,
    openGraph: {
      title: `${product.lotId} — Comprovante SELVA`,
      description: desc,
      siteName: 'SELVA — Rastreabilidade Amazônica',
      type: 'website',
    },
  };
}

export default async function PublicPage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;
  const product = await fetchProduct(lotId);

  const green = '#c3e438';
  const dark = '#1a2200';
  const bg = '#0d1400';

  if (!product) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', margin: '0 0 8px', fontWeight: 700 }}>Produção não encontrada</p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Verifique o código e tente novamente.</p>
        </div>
      </div>
    );
  }

  const isOffline = product.syncStatus === 'PENDING' || !product.traces?.some((t: any) => t.txHash);
  const dateStr = product.onChainAt ? new Date(product.onChainAt).toLocaleDateString('pt-BR') : '—';
  const volumeStr = `${Number(product.volume).toLocaleString('pt-BR')} ${product.unit || 'KG'}`;
  const originTypeLabel = ORIGIN_LABELS[product.originType] ?? 'Pessoa física';

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'system-ui, -apple-system, sans-serif', color: '#f0f0ee' }}>
      {/* Header */}
      <div style={{ background: dark, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${green}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: green, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            <img src="/selva.png" alt="SELVA" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: green, letterSpacing: '0.05em' }}>SELVA</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>AMAZONIC BLOCKCHAIN ECOSYSTEM</div>
          </div>
        </div>
        <div style={{
          fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
          background: isOffline ? 'rgba(251,191,36,0.15)' : 'rgba(195,228,56,0.12)',
          color: isOffline ? '#fbbf24' : green,
          border: `1px solid ${isOffline ? 'rgba(251,191,36,0.25)' : 'rgba(195,228,56,0.25)'}`,
        }}>
          {isOffline ? '⏳ Sincronizando' : '✓ Verificado'}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Producer card */}
        <div style={{ background: 'rgba(195,228,56,0.06)', border: `1px solid rgba(195,228,56,0.18)`, borderRadius: 14, padding: '18px 20px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: green, letterSpacing: '0.08em', margin: '0 0 6px', textTransform: 'uppercase' }}>Produtor / Origem</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#f0f0ee', margin: '0 0 4px', lineHeight: 1.2 }}>{product.producerName || '—'}</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{originTypeLabel} · {product.origin}</p>
        </div>

        {/* Data grid */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', margin: '0 0 14px', textTransform: 'uppercase' }}>Dados da Produção</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Volume', value: volumeStr },
              { label: 'Código da produção', value: product.lotId },
              { label: 'Data de registro', value: dateStr },
              { label: 'Responsável atual', value: product.currentOwnerName || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0ee', textAlign: 'right' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        {product.traces && product.traces.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', margin: 0, textTransform: 'uppercase' }}>Histórico da Produção</p>
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {product.traces.map((trace: any, idx: number) => {
                const dotColor = trace.action === 'DEACTIVATED' ? '#f87171' : trace.action === 'TRANSFERRED' ? '#60a5fa' : green;
                const traceDate = trace.blockTimestamp ? new Date(trace.blockTimestamp).toLocaleDateString('pt-BR') : '—';
                let description = ACTION_LABELS[trace.action] ?? trace.action;
                if (trace.action === 'CREATED' && trace.toName) {
                  description = `Cadastrado por ${trace.toName}`;
                } else if (trace.action === 'TRANSFERRED') {
                  const from = trace.fromName || 'anterior';
                  const to = trace.toName || 'destinatário';
                  description = `${from} → ${to}`;
                }

                return (
                  <div key={trace.id ?? idx} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 3 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor }} />
                      {idx < product.traces.length - 1 && (
                        <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.08)', marginTop: 4 }} />
                      )}
                    </div>
                    <div style={{ flex: 1, paddingBottom: idx < product.traces.length - 1 ? 4 : 0 }}>
                      <p style={{ fontSize: 13, color: '#f0f0ee', margin: '0 0 2px', lineHeight: 1.4 }}>{description}</p>
                      <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{traceDate}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Technical section — collapsible native HTML */}
        <details style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
          <summary style={{ padding: '13px 20px', fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', listStyleType: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Informações Técnicas</span>
            <span style={{ fontSize: 10 }}>▼</span>
          </summary>
          <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Código do lote', value: product.lotId },
              { label: 'Código de verificação do documento', value: product.documentHash || '—' },
              { label: 'Identificador do produtor', value: product.producerAddress || '—' },
              { label: 'Identificador do responsável atual', value: product.currentOwnerAddress || '—' },
              { label: 'Rede de verificação', value: 'Polygon Amoy (chainId 80002)' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, fontFamily: 'monospace', wordBreak: 'break-all' }}>{value}</p>
              </div>
            ))}
            {product.traces?.filter((t: any) => t.txHash).map((trace: any) => (
              <div key={trace.txHash}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Código da transação ({ACTION_LABELS[trace.action] ?? trace.action})
                </p>
                <a
                  href={`https://amoy.polygonscan.com/tx/${trace.txHash}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11, color: '#60a5fa', fontFamily: 'monospace', wordBreak: 'break-all', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                >
                  {trace.txHash}
                </a>
              </div>
            ))}
          </div>
        </details>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.2)', margin: 0 }}>
            selva.eco.br · Emitido em {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
}
