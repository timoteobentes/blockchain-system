'use client';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { shortenAddress } from '@/lib/utils';
import { Wallet, Circle } from 'lucide-react';
import { polygonAmoy } from '@/lib/wagmi';

export function WalletStatus() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address, chainId: polygonAmoy.id });
  const isCorrectNetwork = chain?.id === polygonAmoy.id;

  if (!isConnected) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
      <Circle
        className={`h-2 w-2 fill-current ${isCorrectNetwork ? 'text-[#c3e438]' : 'text-yellow-400'}`}
      />
      <Wallet className="h-4 w-4 text-white/50" />
      <span className="text-white font-mono">{shortenAddress(address ?? '')}</span>
      {balance && (
        <span className="text-white/50 ml-1">
          {parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(3)} MATIC
        </span>
      )}
    </div>
  );
}
