// ─── ABI (importar em wagmi/viem com "as const") ─────────────────────────
export { default as SELVA_ABI } from './abis/SELVATraceability.json';

// ─── Contract types (SELVATraceability.sol) ───────────────────────────────

export type UserHash = `0x${string}`;
export type Address = `0x${string}`;
export type Bytes32 = `0x${string}`;

export type TraceAction = 'CREATED' | 'TRANSFERRED' | 'DEACTIVATED';

export interface ContractUser {
  name: string;
  cpf: string;
  account: Address;
  createdAt: bigint;
}

export interface ContractProduct {
  lotId: string;
  volume: bigint;
  origin: string;
  producer: Address;
  currentOwner: Address;
  documentHash: Bytes32;
  createdAt: bigint;
  active: boolean;
}

export interface ContractTrace {
  actor: Address;
  action: TraceAction;
  docHash: Bytes32;
  from: Address;
  to: Address;
  timestamp: bigint;
}

// ─── API DTOs ─────────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  userHash: string;
  name: string;
  walletAddress: string;
  isProducer: boolean;
  createdAt: string;
}

export interface ProductDto {
  id: string;
  lotId: string;
  volume: number;
  origin: string;
  producerAddress: string;
  currentOwnerAddress: string;
  documentHash: string;
  active: boolean;
  createdAt: string;
}

export interface TraceDto {
  id: string;
  actor: string;
  action: TraceAction;
  docHash: string;
  fromAddress: string;
  toAddress: string;
  blockTimestamp: string;
  txHash: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
