'use client';
import { useWallets } from '@privy-io/react-auth';
import { shortenAddress } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export function WalletStatus() {
  const { wallets } = useWallets();
  const { user } = useAuth();
  // Ignorar embedded wallets do Privy — mostrar apenas carteiras externas (MetaMask, etc.)
  const externalWallet = wallets.find(w => (w as any).walletClientType !== 'privy');
  const address = externalWallet?.address as `0x${string}` | undefined;

  // Usuário autenticado mas sem carteira visível — mostra nome
  if (!address && user?.name) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: '#60a5fa',
          boxShadow: '0 0 5px #60a5fa80',
        }} />
        <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>
          {user.name.split(' ')[0]}
        </span>
      </div>
    );
  }

  // Usuário com carteira conectada
  if (!address) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
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
    </div>
  );
}
