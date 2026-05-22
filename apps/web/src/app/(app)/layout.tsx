'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { WalletStatus } from '@/components/WalletStatus';
import { NetworkGuard } from '@/components/NetworkGuard';
import { useAuth } from '@/hooks/useAuth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [initialized, isAuthenticated, router]);

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c3e438] border-t-transparent" />
      </div>
    );
  }

  return (
    <NetworkGuard>
      <div className="flex min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <div className="flex flex-1 flex-col pl-60">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-end border-b border-white/10 bg-[#0a0a0a]/80 px-6 backdrop-blur-sm">
            <WalletStatus />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </NetworkGuard>
  );
}
