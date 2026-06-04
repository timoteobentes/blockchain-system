'use client';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { api } from '@/lib/api';

export type ConnectionMode = 'OFFLINE' | 'DIGITAL' | 'VERIFIED';

export interface ModeInfo {
  mode: ConnectionMode;
  label: string;
  description: string;
  color: string;
  dot: string;
}

export const MODE_INFO: Record<ConnectionMode, ModeInfo> = {
  OFFLINE: {
    mode: 'OFFLINE',
    label: 'Sem Conexão',
    description: 'Sem internet — dados salvos no dispositivo',
    color: '#fbbf24',
    dot: '#fbbf24',
  },
  DIGITAL: {
    mode: 'DIGITAL',
    label: 'Modo Digital',
    description: 'Online — dados registrados no sistema',
    color: '#60a5fa',
    dot: '#60a5fa',
  },
  VERIFIED: {
    mode: 'VERIFIED',
    label: 'Modo Verificado',
    description: 'Online + verificação em rede descentralizada',
    color: '#c3e438',
    dot: '#c3e438',
  },
};

export function useConnectionMode(): ModeInfo {
  const { isConnected } = useAccount();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [blockchainEnabled, setBlockchainEnabled] = useState(false);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    api.sync.status()
      .then(s => setBlockchainEnabled(s.blockchainEnabled))
      .catch(() => setBlockchainEnabled(false));
  }, [isOnline]);

  if (!isOnline) return MODE_INFO.OFFLINE;
  if (isConnected && blockchainEnabled) return MODE_INFO.VERIFIED;
  return MODE_INFO.DIGITAL;
}
