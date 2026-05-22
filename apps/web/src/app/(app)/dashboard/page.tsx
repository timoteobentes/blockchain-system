'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Users, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { shortenAddress, formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ users: 0, products: 0, active: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.users.list(1, 1),
      api.products.list({ limit: 5 }),
    ]).then(([users, products]) => {
      setStats({
        users: users.total,
        products: products.total,
        active: products.data.filter((p: any) => p.active).length,
      });
      setRecent(products.data.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Olá, {user?.name?.split(' ')[0] ?? 'produtor'} 👋
        </h1>
        <p className="text-white/50 text-sm mt-1">Visão geral do sistema de rastreabilidade</p>
      </div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      >
        {[
          { label: 'Usuários registrados', value: stats.users, icon: Users, color: 'text-blue-400' },
          { label: 'Lotes cadastrados', value: stats.products, icon: Package, color: 'text-[#c3e438]' },
          { label: 'Lotes ativos', value: stats.active, icon: CheckCircle, color: 'text-emerald-400' },
        ].map((s) => (
          <motion.div key={s.label} variants={fadeUp}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/50">{s.label}</p>
                    <p className={`text-3xl font-bold mt-1 ${s.color}`}>
                      {loading ? '—' : s.value}
                    </p>
                  </div>
                  <s.icon className={`h-8 w-8 ${s.color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lotes recentes</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/products">Ver todos <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />)}
            </div>
          ) : recent.length === 0 ? (
            <p className="text-center text-white/40 py-8">Nenhum lote cadastrado ainda</p>
          ) : (
            <div className="space-y-2">
              {recent.map((p) => (
                <Link
                  key={p.lotId}
                  href={`/products/${p.lotId}`}
                  className="flex items-center justify-between rounded-lg bg-white/5 p-3 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-[#c3e438]" />
                    <div>
                      <p className="text-sm font-medium text-white">{p.lotId}</p>
                      <p className="text-xs text-white/40">{p.origin}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.active ? 'default' : 'secondary'}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-white/30 group-hover:text-white/60 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
