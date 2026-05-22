'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Plus, Search, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { shortenAddress, formatDate, formatVolume } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('');

  const fetchProducts = (p = page) => {
    setLoading(true);
    api.products.list({ page: p, limit: 15, active: activeFilter || undefined })
      .then((res: any) => { setProducts(res.data); setTotal(res.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(1); setPage(1); }, [activeFilter]);
  useEffect(() => { fetchProducts(page); }, [page]);

  const filtered = search
    ? products.filter(p => p.lotId.toLowerCase().includes(search.toLowerCase()) || p.origin.toLowerCase().includes(search.toLowerCase()))
    : products;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Lotes</h1>
          <p className="text-white/50 text-sm mt-1">{total} lotes registrados na blockchain</p>
        </div>
        {(user?.isProducer || user?.isAdmin) && (
          <Button asChild>
            <Link href="/products/new"><Plus className="h-4 w-4" /> Novo Lote</Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input placeholder="Buscar por ID ou origem..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['', 'true', 'false'].map((v) => (
            <button
              key={v}
              onClick={() => setActiveFilter(v)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeFilter === v ? 'bg-[#c3e438]/20 text-[#c3e438]' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
            >
              {v === '' ? 'Todos' : v === 'true' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-white/40">
              <Package className="h-10 w-10" />
              <p>Nenhum lote encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {/* Header */}
              <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                <span>ID do Lote</span><span>Origem</span><span>Volume</span><span>Produtor</span><span>Status</span><span />
              </div>
              {filtered.map((p) => (
                <div key={p.lotId} className="grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center hover:bg-white/5 transition-colors">
                  <span className="font-mono text-sm text-[#c3e438] font-medium">{p.lotId}</span>
                  <span className="text-sm text-white/80 truncate">{p.origin}</span>
                  <span className="text-sm text-white/60">{formatVolume(p.volume)}</span>
                  <span className="font-mono text-xs text-white/40">{shortenAddress(p.producerAddress)}</span>
                  <Badge variant={p.active ? 'default' : 'secondary'}>{p.active ? 'Ativo' : 'Inativo'}</Badge>
                  <Link href={`/products/${p.lotId}`} className="text-white/30 hover:text-[#c3e438] transition-colors">
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 15 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
          <span className="text-sm text-white/50">Página {page} de {Math.ceil(total / 15)}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 15)}>Próxima</Button>
        </div>
      )}
    </div>
  );
}
