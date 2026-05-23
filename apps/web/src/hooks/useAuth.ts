'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useRouter } from 'next/navigation';
import { api, setToken, clearToken, getToken } from '@/lib/api';

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export interface AuthUser {
  address: string;
  isRegistered: boolean;
  isProducer: boolean;
  isAdmin: boolean;
  name?: string;
}

function userFromToken(token: string): AuthUser | null {
  const p = parseJwt(token);
  if (!p?.sub) return null;
  return {
    address: p.sub,
    isRegistered: p.isRegistered ?? false,
    isProducer: p.isProducer ?? false,
    isAdmin: p.isAdmin ?? false,
  };
}

export function useAuth() {
  const router = useRouter();
  const { address, isConnected, chain } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  // Hydrate synchronously from JWT so isAdmin/isProducer are correct on first render
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') return null;
    const token = getToken();
    return token ? userFromToken(token) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!getToken();
  });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token && address) {
      api.users.me()
        .then((u: any) => {
          setUser({
            address: u.walletAddress,
            isRegistered: true,
            isProducer: u.isProducer,
            isAdmin: u.isAdmin,
            name: u.name,
          });
          setIsAuthenticated(true);
        })
        .catch(() => {
          // 401 is already handled by api.ts (clears token + redirects to /auth)
          // For other errors (e.g. 404 — admin not yet in User table), keep JWT state
        })
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
        const result = await connectAsync({ connector: injected() });
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
    router.push('/auth');
  }, [disconnect, router]);

  return { user, loading, error, isAuthenticated, initialized, connectAndSign, logout, address, isConnected, chain };
}
