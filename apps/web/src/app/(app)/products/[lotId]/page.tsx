/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, ArrowRightLeft, AlertCircle, Download, Clock, Leaf, ExternalLink } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { api, downloadCertificate } from '@/lib/api';
import { shortenAddress, formatDate, formatVolume } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const ACTION_MAP: Record<string, { label: string; color: string; bg: string }> = {
  CREATED:     { label: 'Cadastro realizado',   color: '#c3e438',  bg: 'rgba(195,228,56,0.12)'  },
  TRANSFERRED: { label: 'Produção transferida',  color: '#60a5fa',  bg: 'rgba(96,165,250,0.12)'  },
  DEACTIVATED: { label: 'Produção desativada',   color: '#f87171',  bg: 'rgba(248,113,113,0.12)' },
};

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 13.5, color: '#f0f0ee', fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

export default function ProductDetailPage() {
  const { lotId } = useParams<{ lotId: string }>();
  const { address } = useAccount();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [certLoading, setCertLoading] = useState(false);

  useEffect(() => {
    if (!lotId) return;
    Promise.all([api.products.byLotId(lotId), api.products.history(lotId)])
      .then(([p, h]) => { setProduct(p); setHistory(h); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [lotId]);

  const isOwner = address && product && address.toLowerCase() === product.currentOwnerAddress?.toLowerCase();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 120, borderRadius: 14, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />
        ))}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
        <AlertCircle size={36} />
        <p style={{ margin: 0, fontSize: 14 }}>Lote não encontrado</p>
        <Button asChild variant="outline"><Link href="/products">Voltar para lotes</Link></Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/products" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', flexShrink: 0, marginTop: 2 }}>
          <ArrowLeft size={16} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f0f0ee', margin: 0, fontFamily: 'monospace' }}>{product.lotId}</h1>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
              background: product.active ? 'rgba(195,228,56,0.12)' : 'rgba(255,255,255,0.06)',
              color: product.active ? '#c3e438' : 'rgba(255,255,255,0.35)',
            }}>
              {product.active ? 'Ativo' : 'Inativo'}
            </span>
            {product.syncStatus === 'PENDING' && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> Registro digital pendente
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '5px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.origin}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Button
            variant="outline" size="sm" loading={certLoading}
            style={{ padding: "4px 12px", cursor: "pointer" }}
            onClick={async () => {
              setCertLoading(true);
              try { await downloadCertificate(lotId as string); }
              finally { setCertLoading(false); }
            }}
          >
            <Download size={14} /> Certificado
          </Button>
          {isOwner && product.active && (
            <Button asChild variant="outline" size="sm" style={{ padding: "4px 12px", cursor: "pointer" }}>
              <Link href={`/products/${lotId}/transfer`}><ArrowRightLeft size={14} /> Transferir produção</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 22px' }}>
        <p style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.4)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dados da Produção</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px 24px' }}>
          <InfoRow label="Quantidade produzida" value={formatVolume(product.volume)} />
          <InfoRow label="Quem cadastrou a produção" value={shortenAddress(product.producerAddress)} mono />
          <InfoRow label="Responsável atual pela produção" value={shortenAddress(product.currentOwnerAddress)} mono />
          <InfoRow label="Código de verificação do documento" value={product.documentHash ? product.documentHash.slice(0, 10) + '...' + product.documentHash.slice(-8) : '—'} mono />
        </div>
      </div>

      {/* Timeline */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f0f0ee', margin: 0 }}>Histórico da Produção</p>
        </div>

        {history.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '40px 20px', color: 'rgba(255,255,255,0.25)' }}>
            <Package size={32} />
            <p style={{ margin: 0, fontSize: 13 }}>Nenhum evento registrado</p>
          </div>
        ) : (
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 13, top: 14, bottom: 14, width: 1, background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {history.map((trace, idx) => {
                  const action = ACTION_MAP[trace.action] ?? { label: trace.action, color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.08)' };
                  return (
                    <div key={trace.id ?? idx} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                      <div style={{ width: 27, height: 27, borderRadius: '50%', background: action.bg, border: `1px solid ${action.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, position: 'relative' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: action.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: action.color }}>{action.label}</span>
                          <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)' }}>{formatDate(trace.blockTimestamp)}</span>
                        </div>
                        {trace.action === 'TRANSFERRED' && trace.fromAddress && trace.toAddress && (
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0', fontFamily: 'monospace' }}>
                            {shortenAddress(trace.fromAddress)} → {shortenAddress(trace.toAddress)}
                          </p>
                        )}
                        {trace.txHash && (
                          <a
                            href={`https://amoy.polygonscan.com/tx/${trace.txHash}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 3 }}
                            className="tx-link"
                          >
                            {shortenAddress(trace.txHash, 8)} <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .tx-link:hover { color: #c3e438 !important; }
      `}</style>
    </div>
  );
}
