/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Users, CheckCircle, Plus, ArrowRight, TrendingUp, Leaf, Globe, UserCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

function StatCard({ label, value, icon: Icon, color, loading, sub }: { label: string; value: string | number; icon: any; color: string; loading: boolean; sub?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={22} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ fontSize: 26, fontWeight: 800, color: loading ? 'rgba(255,255,255,0.15)' : '#f0f0ee', margin: '2px 0 0', lineHeight: 1 }}>
          {loading ? '—' : value}
        </p>
        {sub && !loading && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '3px 0 0' }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [myStats, setMyStats] = useState({ total: 0, active: 0, totalValue: 0, hasPrice: false });
  const [globalStats, setGlobalStats] = useState({ products: 0, users: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  useEffect(() => {
    if (!user) return;

    const isProducer = user.isProducer || user.isAdmin;
    const fetches: Promise<any>[] = [];

    if (isProducer) {
      fetches.push(api.products.mine({ limit: 5 }));
    } else {
      fetches.push(Promise.resolve({ data: [], total: 0 }));
    }

    if (user.isAdmin) {
      fetches.push(api.products.list({ limit: 1 }));
      fetches.push(api.users.list(1, 1));
    }

    fetches.push(api.users.me());

    Promise.all(fetches).then(results => {
      const myProducts = results[0];
      const adminProducts = user.isAdmin ? results[1] : null;
      const adminUsers = user.isAdmin ? results[2] : null;
      const profile = results[user.isAdmin ? 3 : 1];

      const active = myProducts.data.filter((p: any) => p.active).length;
      const withPrice = myProducts.data.filter((p: any) => p.pricePerUnit != null);
      const totalValue = withPrice.reduce((acc: number, p: any) => acc + (p.volume * p.pricePerUnit), 0);

      setMyStats({ total: myProducts.total, active, totalValue, hasPrice: withPrice.length > 0 });
      if (adminProducts) setGlobalStats({ products: adminProducts.total, users: adminUsers?.total ?? 0 });
      setRecent(myProducts.data.slice(0, 5));
      setProfileIncomplete(!profile?.city && !profile?.phone);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = user?.name?.split(' ')[0] ?? 'produtor';
  const isProducer = user?.isProducer || user?.isAdmin;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f0f0ee', margin: 0 }}>{greeting}, {firstName}</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
            {isProducer ? 'Resumo das suas produções' : 'Bem-vindo ao sistema SELVA'}
          </p>
        </div>
        {isProducer && (
          <Button asChild style={{ padding: "6px 12px" }}>
            <Link href="/products/new"><Plus size={15} /> Cadastrar produção</Link>
          </Button>
        )}
      </div>

      {/* Alerta de perfil incompleto */}
      {!loading && profileIncomplete && (
        <Link href="/profile" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', cursor: 'pointer' }}>
            <UserCircle size={18} color="#fbbf24" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24', margin: 0 }}>Complete seu perfil</p>
              <p style={{ fontSize: 12, color: 'rgba(251,191,36,0.7)', margin: '2px 0 0' }}>Adicione seu endereço e contato para facilitar o cadastro de produções.</p>
            </div>
            <ArrowRight size={14} color="rgba(251,191,36,0.5)" />
          </div>
        </Link>
      )}

      {/* Stats do produtor */}
      {isProducer && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          <StatCard label="Minhas produções" value={myStats.total} icon={Package} color="#c3e438" loading={loading} />
          <StatCard label="Produções ativas" value={myStats.active} icon={CheckCircle} color="#34d399" loading={loading} />
          {myStats.hasPrice && (
            <StatCard
              label="Valor estimado"
              value={`R$ ${myStats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              icon={TrendingUp} color="#a78bfa" loading={loading}
              sub="soma volume × preço"
            />
          )}
        </div>
      )}

      {/* Stats globais (admin) */}
      {user?.isAdmin && (
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Visão geral da plataforma</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <StatCard label="Total de produções" value={globalStats.products} icon={Globe} color="#60a5fa" loading={loading} />
            <StatCard label="Usuários registrados" value={globalStats.users} icon={Users} color="#f472b6" loading={loading} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
        {/* Produções recentes */}
        {isProducer && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#f0f0ee', margin: 0 }}>Minhas produções recentes</p>
              <Link href="/products" style={{ fontSize: 12, color: '#c3e438', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
            {loading ? (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 52, borderRadius: 10, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite' }} />)}
              </div>
            ) : recent.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '40px 20px', color: 'rgba(255,255,255,0.25)' }}>
                <Package size={32} />
                <p style={{ margin: 0, fontSize: 13 }}>Nenhuma produção cadastrada ainda</p>
              </div>
            ) : (
              <div>
                {recent.map((p, i) => (
                  <Link key={p.lotId} href={`/products/${p.lotId}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < recent.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', textDecoration: 'none', transition: 'background 0.15s' }}
                    className="dash-row"
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(195,228,56,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Leaf size={15} color="#c3e438" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#f0f0ee', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.productName || p.lotId}
                      </p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0', fontFamily: 'monospace' }}>{p.lotId}</p>
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
        )}

        {/* Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/rede" style={{ textDecoration: 'none' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} className="dash-row">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(195,228,56,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Globe size={18} color="#c3e438" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#f0f0ee', margin: 0 }}>Rede SELVA</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>Ver todas as produções da plataforma</p>
              </div>
              <ArrowRight size={14} color="rgba(255,255,255,0.3)" />
            </div>
          </Link>

          {!isProducer && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 22px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f0f0ee', margin: '0 0 6px' }}>Sobre a ferramenta</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6 }}>
                O SELVA ajuda produtores a organizar informações de produção, comprovar origem e gerar rastreabilidade digital com registro em blockchain.
              </p>
            </div>
          )}

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
