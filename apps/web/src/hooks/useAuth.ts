'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
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
  const { login, logout: privyLogout, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();

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
  const pendingSign = useRef(false);

  const primaryWallet = wallets[0];
  const address = primaryWallet?.address as `0x${string}` | undefined;

  // Refresh user state from /me once Privy + wallet are ready
  useEffect(() => {
    if (!ready) return;
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
          // 401 handled by api.ts; 404 (admin not in User table) keeps JWT state
        })
        .finally(() => setInitialized(true));
    } else if (!token) {
      setInitialized(true);
    }
    // if token present but address not yet loaded, wait for next effect run
  }, [ready, address]);

  // Sign SELVA nonce with the Privy wallet (embedded or external)
  const doSign = useCallback(async () => {
    const wallet = wallets[0];
    if (!wallet) throw new Error('Carteira não disponível');
    setLoading(true);
    setError(null);
    try {
      const addr = wallet.address;
      const { message } = await api.auth.nonce(addr);
      const provider = await wallet.getEthereumProvider();
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, addr],
      }) as string;
      const { token, user: userData } = await api.auth.verify(addr, signature);
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
  }, [wallets]);

  // Auto-sign nonce after Privy login modal completes
  useEffect(() => {
    if (authenticated && wallets.length > 0 && pendingSign.current && !getToken()) {
      pendingSign.current = false;
      doSign().catch(() => {});
    }
  }, [authenticated, wallets, doSign]);

  const connectAndSign = useCallback(async () => {
    if (!authenticated) {
      pendingSign.current = true;
      login();
      return;
    }
    return doSign();
  }, [authenticated, login, doSign]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setIsAuthenticated(false);
    privyLogout();
    router.push('/auth');
  }, [privyLogout, router]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    initialized,
    connectAndSign,
    logout,
    address,
    isConnected: !!address,
    chain: null,
  };
}
