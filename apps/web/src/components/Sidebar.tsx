'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Plus, Users, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navItems: { href: string; label: string; icon: React.FC<any>; adminOnly?: boolean; producerOnly?: boolean }[] = [
  { href: '/dashboard', label: 'Painel inicial', icon: LayoutDashboard },
  { href: '/products', label: 'Produções cadastradas', icon: Package },
  { href: '/products/new', label: 'Cadastrar produção', icon: Plus },
  { href: '/admin/users', label: 'Usuários', icon: Users, adminOnly: true },
];

interface SidebarProps { onClose: () => void; }

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      <style>{`
        .sb-link:hover { background: rgba(255,255,255,0.05) !important; color: rgba(255,255,255,0.8) !important; }
        .sb-logout:hover { background: rgba(239,68,68,0.08) !important; color: #f87171 !important; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#060805' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', height: 60, padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#c3e438', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/selva.png" alt="SELVA" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            </div>
            <div>
              <p style={{ fontWeight: 800, color: '#f0f0ee', fontSize: 15, lineHeight: 1, margin: 0 }}>SELVA</p>
              <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.3)', lineHeight: 1, margin: '3px 0 0' }}>AMAZONIC BLOCKCHAIN ECOSYSTEM</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          <p style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '0 10px', margin: '0 0 10px' }}>
            Navegação
          </p>
          {navItems.map(({ href, label, icon: Icon, producerOnly, adminOnly }) => {
            if (producerOnly && !user?.isProducer && !user?.isAdmin) return null;
            if (adminOnly && !user?.isAdmin) return null;
            const active = pathname === href || (
              href !== '/dashboard' &&
              pathname.startsWith(href + '/') &&
              !navItems.some(other => other.href !== href && (pathname === other.href || pathname.startsWith(other.href + '/')))
            );
            return (
              <Link key={href} href={href} onClick={onClose}
                className={cn(!active && 'sb-link')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, textDecoration: 'none',
                  fontSize: 13.5, fontWeight: active ? 600 : 500,
                  color: active ? '#c3e438' : 'rgba(255,255,255,0.5)',
                  background: active ? 'rgba(195,228,56,0.1)' : 'transparent',
                  transition: 'all 0.15s',
                }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(195,228,56,0.15)' : 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
                  <Icon size={15} />
                </div>
                <span style={{ flex: 1 }}>{label}</span>
                {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c3e438' }} />}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(195,228,56,0.15)', border: '1px solid rgba(195,228,56,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c3e438', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {(user.name ?? 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: '#f0f0ee', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name ?? 'Usuário'}</p>
                <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                  {user.isAdmin ? 'Administrador' : user.isProducer ? 'Produtor' : 'Usuário'}
                </p>
              </div>
            </div>
          )}
          <button onClick={logout} className="sb-logout"
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', color: 'rgba(255,100,100,0.5)', fontSize: 13.5, fontWeight: 500, transition: 'all 0.15s', textAlign: 'left' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', flexShrink: 0 }}>
              <LogOut size={15} />
            </div>
            Sair da conta
          </button>
        </div>
      </div>
    </>
  );
}
