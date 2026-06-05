const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const TOKEN_KEY = 'selva_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/auth';
    throw new Error('Não autenticado');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Erro na requisição');
  }

  return res.json();
}

export function getPublicProductUrl(lotId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${appUrl}/p/${lotId}`;
}

export async function downloadCertificate(lotId: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/products/${lotId}/certificate`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Falha ao gerar certificado');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SELVA-Certificado-${lotId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export const api = {
  auth: {
    nonce: (address: string) =>
      request<{ message: string }>('/api/auth/nonce', { method: 'POST', body: JSON.stringify({ address }) }),
    verify: (address: string, signature: string) =>
      request<{ token: string; user: any }>('/api/auth/verify', { method: 'POST', body: JSON.stringify({ address, signature }) }),
    privyLogin: (privyToken: string) =>
      request<{ token: string; user: any }>('/api/auth/privy-login', { method: 'POST', body: JSON.stringify({ privyToken }) }),
  },
  users: {
    list: (page = 1, limit = 20) => request<any>(`/api/users?page=${page}&limit=${limit}`),
    me: () => request<any>('/api/users/me'),
    updateMe: (data: Record<string, any>) => request<any>('/api/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
    byAddress: (address: string) => request<any>(`/api/users/${address}`),
    lookupByCpf: (cpf: string) => request<{ name: string; walletAddress: string; isProducer: boolean }>(`/api/users/lookup?cpf=${encodeURIComponent(cpf)}`),
  },
  producers: {
    list: () => request<any[]>('/api/producers'),
    promote: (address: string) => request<any>(`/api/producers/${address}/promote`, { method: 'POST' }),
  },
  products: {
    list: (params: Record<string, any> = {}) => {
      const q = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
      ).toString();
      return request<any>(`/api/products${q ? '?' + q : ''}`);
    },
    mine: (params: Record<string, any> = {}) => {
      const q = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
      ).toString();
      return request<any>(`/api/products/mine${q ? '?' + q : ''}`);
    },
    byLotId: (lotId: string) => request<any>(`/api/products/${lotId}`),
    public: (lotId: string) => request<any>(`/api/products/${lotId}/public`),
    history: (lotId: string) => request<any[]>(`/api/products/${lotId}/history`),
    deactivate: (lotId: string) => request<any>(`/api/products/${lotId}`, { method: 'DELETE' }),
  },
  sync: {
    status: () => request<{ blockchainEnabled: boolean; pendingOperations: number }>('/api/sync/status'),
    pending: () => request<any[]>('/api/sync/pending'),
    registerOffline: (data: { name: string; cpf?: string }) =>
      request<any>('/api/sync/register', { method: 'POST', body: JSON.stringify(data) }),
    addProductOffline: (data: { lotId: string; volume: number; origin: string; documentHash: string; originType?: string; productName?: string; unit?: string; pricePerUnit?: number }) =>
      request<any>('/api/sync/product', { method: 'POST', body: JSON.stringify(data) }),
    transferOffline: (data: {
      lotId: string;
      toAddress?: string;
      toName?: string;
      toCpfCnpj?: string;
      toType?: string;
    }) =>
      request<any>('/api/sync/transfer', { method: 'POST', body: JSON.stringify(data) }),
    confirm: (opId: string, txHash: string) =>
      request<any>(`/api/sync/confirm/${opId}`, { method: 'PATCH', body: JSON.stringify({ txHash }) }),
  },
};
