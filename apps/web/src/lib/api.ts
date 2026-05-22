const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const TOKEN_KEY = 'selva_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

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

export const api = {
  auth: {
    nonce: (address: string) =>
      request<{ message: string }>('/api/auth/nonce', { method: 'POST', body: JSON.stringify({ address }) }),
    verify: (address: string, signature: string) =>
      request<{ token: string; user: any }>('/api/auth/verify', { method: 'POST', body: JSON.stringify({ address, signature }) }),
  },
  users: {
    list: (page = 1, limit = 20) => request<any>(`/api/users?page=${page}&limit=${limit}`),
    me: () => request<any>('/api/users/me'),
    byAddress: (address: string) => request<any>(`/api/users/${address}`),
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
    byLotId: (lotId: string) => request<any>(`/api/products/${lotId}`),
    history: (lotId: string) => request<any[]>(`/api/products/${lotId}/history`),
    deactivate: (lotId: string) => request<any>(`/api/products/${lotId}`, { method: 'DELETE' }),
  },
};
