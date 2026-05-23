/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Plus, Search, ArrowRight, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { shortenAddress, formatVolume } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const LIMIT = 15;

  const fetchProducts = (p = page, filter = activeFilter) => {
    setLoading(true);
    api.products.list({ page: p, limit: LIMIT, active: filter || undefined })
      .then((res: any) => { setProducts(res.data); setTotal(res.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(1, activeFilter); setPage(1); }, [activeFilter]);
  useEffect(() => { fetchProducts(page); }, [page]);

  const filtered = search
    ? products.filter(p =>
        p.lotId.toLowerCase().includes(search.toLowerCase()) ||
        p.origin.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f0f0ee', margin: 0 }}>Produções</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>{loading ? '...' : `${total} produções registradas`}</p>
        </div>
        {(user?.isProducer || user?.isAdmin) && (
          <Button asChild style={{ padding: "4px 12px" }}>
            <Link href="/products/new"><Plus size={15} /> Cadastrar Produção</Link>
          </Button>
        )}
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input
            placeholder="Buscar por Código ou origem..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 34px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#f0f0ee', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['', 'true', 'false'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveFilter(v)}
              style={{
                padding: '7px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 500,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: activeFilter === v ? 'rgba(195,228,56,0.15)' : 'rgba(255,255,255,0.05)',
                color: activeFilter === v ? '#c3e438' : 'rgba(255,255,255,0.45)',
              }}
            >
              {v === '' ? 'Todos' : v === 'true' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>
      </div>

      {/* Table container */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ height: 52, borderRadius: 10, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '60px 20px', color: 'rgba(255,255,255,0.25)' }}>
            <Package size={36} />
            <p style={{ margin: 0, fontSize: 13 }}>Nenhuma produção encontrado</p>
          </div>
        ) : (
          <>
            {/* Desktop header */}
            <div className="products-table-header" style={{ display: 'grid', gridTemplateColumns: '1.4fr 2fr 0.8fr 1.2fr 0.7fr 36px', gap: 12, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Código da Produção', 'Local de Origem da Produção', 'Quantidade Produzida', 'Proprietário', 'Status', ''].map(h => (
                <span key={h} style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.map((p, i) => (
                <Link
                  key={p.lotId}
                  href={`/products/${p.lotId}`}
                  className="product-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 2fr 0.8fr 1.2fr 0.7fr 36px',
                    gap: 12, padding: '13px 20px',
                    borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    textDecoration: 'none', transition: 'background 0.15s', alignItems: 'center',
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#c3e438', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.lotId}</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.origin}</span>
                  <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>{formatVolume(p.volume)}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>{shortenAddress(p.currentOwnerAddress ?? p.producerAddress)}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, display: 'inline-block',
                    background: p.active ? 'rgba(195,228,56,0.12)' : 'rgba(255,255,255,0.06)',
                    color: p.active ? '#c3e438' : 'rgba(255,255,255,0.35)',
                  }}>
                    {p.active ? 'Ativo' : 'Inativo'}
                  </span>
                  <ArrowRight size={14} color="rgba(255,255,255,0.25)" />
                </Link>
              ))}
            </div>

            {/* Mobile cards */}
            <div className="products-cards" style={{ display: 'none', flexDirection: 'column', gap: 8, padding: 12 }}>
              {filtered.map((p) => (
                <Link key={p.lotId} href={`/products/${p.lotId}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(195,228,56,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Leaf size={16} color="#c3e438" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#c3e438', fontWeight: 600 }}>{p.lotId}</span>
                        <span style={{
                          fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
                          background: p.active ? 'rgba(195,228,56,0.12)' : 'rgba(255,255,255,0.06)',
                          color: p.active ? '#c3e438' : 'rgba(255,255,255,0.35)',
                        }}>
                          {p.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.origin}</p>
                      <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{formatVolume(p.volume)} · {shortenAddress(p.currentOwnerAddress ?? p.producerAddress)}</p>
                    </div>
                    <ArrowRight size={14} color="rgba(255,255,255,0.25)" style={{ flexShrink: 0, marginTop: 2 }} />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Próxima</Button>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .product-row:hover { background: rgba(255,255,255,0.03) !important; }
        @media (max-width: 640px) {
          .products-table-header { display: none !important; }
          .product-row { display: none !important; }
          .products-cards { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
