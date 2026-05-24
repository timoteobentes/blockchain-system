'use client';
import { useWallets } from '@privy-io/react-auth';
import { useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { shortenAddress } from '@/lib/utils';
import { polygonAmoy } from '@/lib/wagmi';

export function WalletStatus() {
  const { wallets } = useWallets();
  const address = wallets[0]?.address as `0x${string}` | undefined;
  const { data: balance } = useBalance({ address, chainId: polygonAmoy.id });

  if (!address) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 14px',
      borderRadius: 10,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: '#c3e438',
        boxShadow: '0 0 6px #c3e43880',
      }} />
      <span style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#f0f0ee', letterSpacing: '0.02em' }}>
        {shortenAddress(address)}
      </span>
      {balance && (
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 10 }}>
          {parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(3)} MATIC
        </span>
      )}
    </div>
  );
}
