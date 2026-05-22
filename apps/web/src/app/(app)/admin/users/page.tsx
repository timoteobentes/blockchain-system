'use client';
import { useEffect, useState } from 'react';
import { Users, ShieldCheck, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { shortenAddress, formatDate } from '@/lib/utils';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    api.users.list(1, 50)
      .then((res: any) => { setUsers(res.data); setTotal(res.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handlePromote = async (address: string) => {
    setPromoting(address);
    setMsg('');
    try {
      await api.producers.promote(address);
      setMsg(`${shortenAddress(address)} promovido a produtor!`);
      fetchUsers();
    } catch (e: any) {
      setMsg(`Erro: ${e.message}`);
    } finally {
      setPromoting(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Gestão de Usuários</h1>
        <p className="text-white/50 text-sm mt-1">{total} usuários registrados on-chain</p>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${msg.startsWith('Erro') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-[#c3e438]/10 border border-[#c3e438]/20 text-[#c3e438]'}`}>
          <AlertCircle className="h-4 w-4 shrink-0" /> {msg}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />)}</div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-white/40"><Users className="h-10 w-10" /><p>Nenhum usuário registrado</p></div>
          ) : (
            <div className="divide-y divide-white/5">
              <div className="grid grid-cols-[2fr_1.5fr_1fr_auto] gap-4 px-5 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                <span>Nome</span><span>Endereço</span><span>Role</span><span />
              </div>
              {users.map((u) => (
                <div key={u.walletAddress} className="grid grid-cols-[2fr_1.5fr_1fr_auto] gap-4 px-5 py-4 items-center">
                  <span className="text-sm font-medium text-white truncate">{u.name}</span>
                  <span className="font-mono text-xs text-white/40">{shortenAddress(u.walletAddress)}</span>
                  <Badge variant={u.isProducer ? 'default' : 'secondary'}>
                    {u.isProducer ? (
                      <><ShieldCheck className="h-3 w-3 mr-1" />Produtor</>
                    ) : 'Usuário'}
                  </Badge>
                  {!u.isProducer && (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={promoting === u.walletAddress}
                      onClick={() => handlePromote(u.walletAddress)}
                    >
                      <ShieldCheck className="h-3 w-3" /> Promover
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
