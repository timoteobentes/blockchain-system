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
  privyDid?: string;
  walletAddress?: string;
  address?: string;        // alias para walletAddress (compatibilidade)
  isRegistered: boolean;
  isProducer: boolean;
  isAdmin: boolean;
  name?: string;
}

function userFromToken(token: string): AuthUser | null {
  const p = parseJwt(token);
  if (!p?.sub) return null;
  return {
    privyDid: p.privyDid,
    walletAddress: p.walletAddress,
    address: p.walletAddress,
    isRegistered: p.isRegistered ?? false,
    isProducer: p.isProducer ?? false,
    isAdmin: p.isAdmin ?? false,
    name: p.name,
  };
}

export function useAuth() {
  const router = useRouter();
  const { login, logout: privyLogout, authenticated, ready, getAccessToken } = usePrivy();
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
  const pendingLogin = useRef(false);

  const primaryWallet = wallets[0];
  const address = primaryWallet?.address as `0x${string}` | undefined;

  // Atualiza estado do usuário com dados frescos do /me
  useEffect(() => {
    if (!ready) return;
    const token = getToken();
    if (token) {
      api.users.me()
        .then((u: any) => {
          setUser({
            privyDid: u.privyDid,
            walletAddress: u.walletAddress,
            address: u.walletAddress,
            isRegistered: true,
            isProducer: u.isProducer,
            isAdmin: u.isAdmin,
            name: u.name,
          });
          setIsAuthenticated(true);
        })
        .catch(() => {
          // 401 tratado pelo api.ts; outros erros mantêm estado do JWT
        })
        .finally(() => setInitialized(true));
    } else {
      setInitialized(true);
    }
  }, [ready]);

  // Autentica via token Privy (sem assinatura de carteira)
  const doPrivyLogin = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const privyToken = await getAccessToken();
      if (!privyToken) throw new Error('Não foi possível obter o token de acesso');
      const { token, user: userData } = await api.auth.privyLogin(privyToken);
      setToken(token);
      setUser(userData as AuthUser);
      setIsAuthenticated(true);
      return userData as AuthUser;
    } catch (e: any) {
      const msg = e?.message ?? 'Falha na autenticação';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  // Executa login após Privy completar o modal
  useEffect(() => {
    if (authenticated && pendingLogin.current && !getToken()) {
      pendingLogin.current = false;
      doPrivyLogin().catch(() => {});
    }
  }, [authenticated, doPrivyLogin]);

  const authenticate = useCallback(async () => {
    if (!authenticated) {
      pendingLogin.current = true;
      login();
      return;
    }
    return doPrivyLogin();
  }, [authenticated, login, doPrivyLogin]);

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
    authenticate,
    logout,
    address,
    isConnected: !!address,
    chain: null,
  };
}
