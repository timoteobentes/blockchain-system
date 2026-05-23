'use client';
import { useEffect, useState } from 'react';
import { Users, ShieldCheck, AlertCircle, CheckCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { shortenAddress } from '@/lib/utils';

type MsgState = { text: string; type: 'success' | 'error' } | null;

function RoleBadge({ isAdmin, isProducer }: { isAdmin?: boolean; isProducer?: boolean }) {
  if (isAdmin) return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      ⭐ Admin
    </span>
  );
  if (isProducer) return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: 'rgba(195,228,56,0.12)', color: '#c3e438', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <ShieldCheck size={11} /> Produtor
    </span>
  );
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}>
      Usuário
    </span>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [msg, setMsg] = useState<MsgState>(null);
  const [search, setSearch] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    api.users.list(1, 100)
      .then((res: any) => { setUsers(res.data); setTotal(res.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handlePromote = async (address: string, name: string) => {
    setPromoting(address);
    setMsg(null);
    try {
      await api.producers.promote(address);
      setMsg({ text: `${name} promovido a produtor com sucesso!`, type: 'success' });
      fetchUsers();
    } catch (e: any) {
      setMsg({ text: e.message ?? 'Erro ao promover usuário', type: 'error' });
    } finally {
      setPromoting(null);
    }
  };

  const filtered = search
    ? users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.walletAddress?.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f0f0ee', margin: 0 }}>Gestão de Usuários</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>{loading ? '...' : `${total} usuários registrados`}</p>
        </div>
      </div>

      {/* Feedback message */}
      {msg && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 11, background: msg.type === 'success' ? 'rgba(195,228,56,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${msg.type === 'success' ? 'rgba(195,228,56,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
          {msg.type === 'success'
            ? <CheckCircle size={15} color="#c3e438" style={{ flexShrink: 0, marginTop: 1 }} />
            : <AlertCircle size={15} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
          }
          <span style={{ fontSize: 13, color: msg.type === 'success' ? '#c3e438' : '#f87171' }}>{msg.text}</span>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 320 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
        <input
          placeholder="Buscar por nome ou endereço..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0ee', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 56, borderRadius: 10, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '60px 20px', color: 'rgba(255,255,255,0.25)' }}>
            <Users size={36} />
            <p style={{ margin: 0, fontSize: 13 }}>Nenhum usuário encontrado</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="users-table">
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.6fr 1fr auto', gap: 16, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Nome', 'Endereço', 'Papel', ''].map(h => (
                  <span key={h} style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
                ))}
              </div>
              {filtered.map((u, i) => (
                <div
                  key={u.walletAddress}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1.6fr 1fr auto', gap: 16, padding: '13px 20px', alignItems: 'center', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>
                      {(u.name ?? 'U').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#f0f0ee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name ?? '—'}</span>
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{shortenAddress(u.walletAddress)}</span>
                  <RoleBadge isAdmin={u.isAdmin} isProducer={u.isProducer} />
                  {!u.isProducer && !u.isAdmin ? (
                    <Button
                      size="sm" variant="outline"
                      loading={promoting === u.walletAddress}
                      onClick={() => handlePromote(u.walletAddress, u.name)}
                    >
                      <ShieldCheck size={13} /> Promover
                    </Button>
                  ) : (
                    <div style={{ width: 90 }} />
                  )}
                </div>
              ))}
            </div>

            {/* Mobile cards */}
            <div className="users-cards" style={{ display: 'none', flexDirection: 'column', gap: 8, padding: 12 }}>
              {filtered.map((u) => (
                <div
                  key={u.walletAddress}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>
                    {(u.name ?? 'U').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#f0f0ee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name ?? '—'}</span>
                      <RoleBadge isAdmin={u.isAdmin} isProducer={u.isProducer} />
                    </div>
                    <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', margin: 0, fontFamily: 'monospace' }}>{shortenAddress(u.walletAddress)}</p>
                  </div>
                  {!u.isProducer && !u.isAdmin && (
                    <Button
                      size="sm" variant="outline"
                      loading={promoting === u.walletAddress}
                      onClick={() => handlePromote(u.walletAddress, u.name)}
                      style={{ flexShrink: 0 }}
                    >
                      Promover
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @media(max-width:600px){
          .users-table{display:none}
          .users-cards{display:flex !important}
        }
      `}</style>
    </div>
  );
}
