'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { LayoutDashboard, Package, Plus, Users, LogOut, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Lotes', icon: Package },
  { href: '/products/new', label: 'Novo Lote', icon: Plus, producerOnly: true },
  { href: '/admin/users', label: 'Usuários', icon: Users, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-white/10 bg-[#0a0a0a]">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c3e438]">
            <Leaf className="h-4 w-4 text-[#252705]" />
          </div>
          <span className="font-bold text-white text-lg">SELVA</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon, producerOnly, adminOnly }) => {
          if (producerOnly && !user?.isProducer && !user?.isAdmin) return null;
          if (adminOnly && !user?.isAdmin) return null;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-[#c3e438]/15 text-[#c3e438]'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3">
        {user && (
          <div className="mb-2 rounded-lg bg-white/5 px-3 py-2">
            <p className="text-xs font-medium text-white truncate">{user.name ?? 'Usuário'}</p>
            <p className="text-xs text-white/40 mt-0.5">
              {user.isAdmin ? 'Administrador' : user.isProducer ? 'Produtor' : 'Usuário'}
            </p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
