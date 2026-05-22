'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage, useConnect, useDisconnect } from 'wagmi';
import { metaMask } from 'wagmi/connectors';
import { api, setToken, clearToken, getToken } from '@/lib/api';

export interface AuthUser {
  address: string;
  isRegistered: boolean;
  isProducer: boolean;
  isAdmin: boolean;
  name?: string;
}

export function useAuth() {
  const { address, isConnected, chain } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token && address) {
      api.users.me()
        .then((u: any) => {
          setUser({ address: u.walletAddress, isRegistered: true, isProducer: u.isProducer, isAdmin: false, name: u.name });
          setIsAuthenticated(true);
        })
        .catch(() => { clearToken(); setIsAuthenticated(false); })
        .finally(() => setInitialized(true));
    } else {
      setInitialized(true);
    }
  }, [address]);

  const connectAndSign = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let connectedAddress = address;
      if (!isConnected || !connectedAddress) {
        const result = await connectAsync({ connector: metaMask() });
        connectedAddress = result.accounts[0];
      }

      const { message } = await api.auth.nonce(connectedAddress!);
      const signature = await signMessageAsync({ message });
      const { token, user: userData } = await api.auth.verify(connectedAddress!, signature);

      setToken(token);
      setUser(userData as AuthUser);
      setIsAuthenticated(true);
      return userData as AuthUser;
    } catch (e: any) {
      const msg = e?.shortMessage ?? e?.message ?? 'Falha na autenticação';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, connectAsync, signMessageAsync]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setIsAuthenticated(false);
    disconnect();
  }, [disconnect]);

  return { user, loading, error, isAuthenticated, initialized, connectAndSign, logout, address, isConnected, chain };
}
