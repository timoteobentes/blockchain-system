'use client';
import { useWallets } from '@privy-io/react-auth';
import { useSwitchChain } from 'wagmi';
import { polygonAmoy } from '@/lib/wagmi';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { wallets } = useWallets();
  const { switchChainAsync } = useSwitchChain();

  // Only applies to external wallets (MetaMask, etc.) — embedded wallets are managed by Privy
  const externalWallet = wallets.find(w => w.walletClientType !== 'privy');
  const wrongNetwork = externalWallet && externalWallet.chainId !== `eip155:${polygonAmoy.id}`;

  if (wrongNetwork) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-center max-w-sm">
          <AlertTriangle className="h-12 w-12 text-yellow-400" />
          <h2 className="text-xl font-bold text-white">Rede incorreta</h2>
          <p className="text-white/70 text-sm">
            Conecte-se à <strong className="text-[#c3e438]">Polygon Amoy Testnet</strong> para usar o SELVA.
          </p>
          <Button onClick={() => switchChainAsync({ chainId: polygonAmoy.id })}>
            Trocar para Polygon Amoy
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
