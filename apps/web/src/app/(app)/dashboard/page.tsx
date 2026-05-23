/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Users, CheckCircle, Plus, ArrowRight, TrendingUp, Leaf } from 'lucide-react';
import { api } from '@/lib/api';
import { shortenAddress, formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function StatCard({ label, value, icon: Icon, color, loading }: { label: string; value: number; icon: any; color: string; loading: boolean }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={22} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ fontSize: 28, fontWeight: 800, color: loading ? 'rgba(255,255,255,0.15)' : '#f0f0ee', margin: '2px 0 0', lineHeight: 1 }}>
          {loading ? '—' : value}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ users: 0, products: 0, active: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetches: Promise<any>[] = [api.products.list({ limit: 5 })];
    if (user?.isAdmin) fetches.push(api.users.list(1, 1));

    Promise.all(fetches).then(([products, users]) => {
      setStats({
        users: users?.total ?? 0,
        products: products.total,
        active: products.data.filter((p: any) => p.active).length,
      });
      setRecent(products.data.slice(0, 5));
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = user?.name?.split(' ')[0] ?? 'produtor';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f0f0ee', margin: 0 }}>{greeting}, {firstName}</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>Visão geral do sistema de rastreabilidade SELVA</p>
        </div>
        {(user?.isProducer || user?.isAdmin) && (
          <Button asChild style={{ padding: "6px 12px" }}>
            <Link href="/products/new"><Plus size={15} /> Cadastrar produção</Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Produções registradas" value={stats.products} icon={Package} color="#c3e438" loading={loading} />
        <StatCard label="Produções em andamento" value={stats.active} icon={CheckCircle} color="#34d399" loading={loading} />
        {user?.isAdmin && <StatCard label="Usuários" value={stats.users} icon={Users} color="#60a5fa" loading={loading} />}
      </div>

      {/* Recent lots + quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
        {/* Recent lots */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f0f0ee', margin: 0 }}>Últimas produções cadastradas</p>
            <Link href="/products" style={{ fontSize: 12, color: '#c3e438', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
              Ver todas as produções <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 52, borderRadius: 10, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '40px 20px', color: 'rgba(255,255,255,0.25)' }}>
              <Package size={32} />
              <p style={{ margin: 0, fontSize: 13 }}>Nenhuma produção cadastrada ainda</p>
            </div>
          ) : (
            <div>
              {recent.map((p, i) => (
                <Link
                  key={p.lotId}
                  href={`/products/${p.lotId}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                    borderBottom: i < recent.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    textDecoration: 'none', transition: 'background 0.15s',
                  }}
                  className="dash-row"
                >
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(195,228,56,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Leaf size={15} color="#c3e438" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#f0f0ee', margin: 0, fontFamily: 'monospace' }}>{p.lotId}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.origin}</p>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                    background: p.active ? 'rgba(195,228,56,0.12)' : 'rgba(255,255,255,0.06)',
                    color: p.active ? '#c3e438' : 'rgba(255,255,255,0.35)',
                  }}>
                    {p.active ? 'Ativo' : 'Inativo'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(user?.isProducer || user?.isAdmin) && (
            <div style={{ background: 'rgba(195,228,56,0.06)', border: '1px solid rgba(195,228,56,0.15)', borderRadius: 14, padding: '20px 22px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#c3e438', margin: '0 0 6px' }}>Cadastro rápido</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 16px', lineHeight: 1.5 }}>Cadastre uma nova produção, informe sua origem, documentos e dados de rastreabilidade.</p>
              <Button asChild className="w-full" style={{ padding: "6px 12px" }}>
                <Link href="/products/new"><Plus size={14} /> Cadastrar nova produção</Link>
              </Button>
            </div>
          )}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 22px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f0f0ee', margin: '0 0 6px' }}>Sobre a ferramenta</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6 }}>
              O SELVA ajuda produtores, associações e parceiros a organizar informações da produção, comprovar origem e gerar rastreabilidade digital por QR Code, com registro seguro em blockchain.
            </p>
          </div>
          {user?.isAdmin && (
            <Link href="/admin/users" style={{ textDecoration: 'none' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} className="dash-row">
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(96,165,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Users size={18} color="#60a5fa" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#f0f0ee', margin: 0 }}>Gestão de usuários</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>Promover produtores</p>
                </div>
                <ArrowRight size={14} color="rgba(255,255,255,0.3)" />
              </div>
            </Link>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .dash-row:hover { background: rgba(255,255,255,0.04) !important; }
      `}</style>
    </div>
  );
}
