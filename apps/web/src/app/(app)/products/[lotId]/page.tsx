'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, ArrowRightLeft, CheckCircle, XCircle, AlertCircle, Download, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, downloadCertificate } from '@/lib/api';
import { shortenAddress, formatDate, formatVolume } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATED: { label: 'Registrado', color: 'text-[#c3e438]' },
  TRANSFERRED: { label: 'Transferido', color: 'text-blue-400' },
  DEACTIVATED: { label: 'Desativado', color: 'text-red-400' },
};

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

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-white/5 animate-pulse" />)}
    </div>
  );

  if (!product) return (
    <div className="flex flex-col items-center gap-3 py-16 text-white/40">
      <AlertCircle className="h-10 w-10" />
      <p>Lote não encontrado</p>
      <Button asChild variant="outline"><Link href="/products">Voltar</Link></Button>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link href="/products"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white font-mono">{product.lotId}</h1>
            <Badge variant={product.active ? 'default' : 'secondary'}>{product.active ? 'Ativo' : 'Inativo'}</Badge>
            {product.syncStatus === 'PENDING' && (
              <Badge variant="secondary" className="text-yellow-400 border-yellow-400/20 bg-yellow-400/10">
                <Clock className="h-3 w-3 mr-1" />Pendente blockchain
              </Badge>
            )}
          </div>
          <p className="text-white/50 text-sm mt-0.5">{product.origin}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            loading={certLoading}
            onClick={async () => {
              setCertLoading(true);
              try { await downloadCertificate(lotId as string); }
              finally { setCertLoading(false); }
            }}
          >
            <Download className="h-4 w-4" /> Certificado
          </Button>
          {isOwner && product.active && (
            <Button asChild variant="outline">
              <Link href={`/products/${lotId}/transfer`}><ArrowRightLeft className="h-4 w-4" /> Transferir</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Info card */}
      <Card>
        <CardHeader><CardTitle>Informações do Lote</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Volume', value: formatVolume(product.volume) },
              { label: 'Produtor original', value: shortenAddress(product.producerAddress) },
              { label: 'Proprietário atual', value: shortenAddress(product.currentOwnerAddress) },
              { label: 'Hash do documento', value: product.documentHash ? shortenAddress(product.documentHash, 6) : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-white/40">{label}</dt>
                <dd className="text-white font-mono mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* Traceability timeline */}
      <Card>
        <CardHeader><CardTitle>Histórico de Rastreabilidade</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center text-white/40 py-4">Nenhum evento registrado ainda</p>
          ) : (
            <div className="relative">
              <div className="absolute left-3.5 top-2 bottom-2 w-px bg-white/10" />
              <div className="space-y-6">
                {history.map((trace, idx) => {
                  const { label, color } = ACTION_LABELS[trace.action] ?? { label: trace.action, color: 'text-white' };
                  return (
                    <motion.div
                      key={trace.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative pl-8 flex items-start gap-3"
                    >
                      <div className={`absolute left-0 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#111] ${color}`}>
                        <div className="h-2 w-2 rounded-full bg-current" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${color}`}>{label}</span>
                          <span className="text-xs text-white/30">{formatDate(trace.blockTimestamp)}</span>
                        </div>
                        {trace.action === 'TRANSFERRED' && (
                          <p className="text-xs text-white/50 mt-0.5 font-mono">
                            {shortenAddress(trace.fromAddress)} → {shortenAddress(trace.toAddress)}
                          </p>
                        )}
                        {trace.txHash && (
                          <a
                            href={`https://amoy.polygonscan.com/tx/${trace.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-white/30 hover:text-[#c3e438] transition-colors font-mono"
                          >
                            {shortenAddress(trace.txHash, 8)} ↗
                          </a>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
