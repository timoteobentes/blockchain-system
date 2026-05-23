'use client';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { shortenAddress } from '@/lib/utils';
import { polygonAmoy } from '@/lib/wagmi';

export function WalletStatus() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address, chainId: polygonAmoy.id });
  const isCorrectNetwork = chain?.id === polygonAmoy.id;

  if (!isConnected) return null;

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
        background: isCorrectNetwork ? '#c3e438' : '#fbbf24',
        boxShadow: `0 0 6px ${isCorrectNetwork ? '#c3e438' : '#fbbf24'}80`,
      }} />
      <span style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#f0f0ee', letterSpacing: '0.02em' }}>
        {shortenAddress(address ?? '')}
      </span>
      {balance && (
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 10 }}>
          {parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(3)} MATIC
        </span>
      )}
    </div>
  );
}
