// ─── Brand constants ──────────────────────────────────────────────────────

export const SELVA_COLORS = {
  primary: '#c3e438',
  primaryDark: '#6b700c',
  dark: '#252705',
  light: '#eef1f5',
} as const;

// ─── Network ──────────────────────────────────────────────────────────────

export const POLYGON_AMOY = {
  chainId: 80002,
  name: 'Polygon Amoy Testnet',
  rpcUrl: 'https://rpc-amoy.polygon.technology',
  blockExplorer: 'https://amoy.polygonscan.com',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
} as const;

// ─── Contract ─────────────────────────────────────────────────────────────

export const TRACE_ACTIONS = {
  CREATED: 'CREATED',
  TRANSFERRED: 'TRANSFERRED',
  DEACTIVATED: 'DEACTIVATED',
} as const;

// ─── Formatters ───────────────────────────────────────────────────────────

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatTimestamp(timestamp: number | bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleString('pt-BR');
}
