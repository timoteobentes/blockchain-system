# SELVA — Documentação Técnica Completa

> Sistema Estruturado Legal de Valores Amazônicos  
> Plataforma de rastreabilidade blockchain para a cadeia produtiva da Amazônia  
> Piloto: óleo-resina de copaíba (*Copaifera langsdorffii*)

---

## Índice

1. [O Problema e a Solução](#1-o-problema-e-a-solução)
2. [Visão Geral da Arquitetura](#2-visão-geral-da-arquitetura)
3. [Fluxos Principais](#3-fluxos-principais)
4. [Estrutura do Monorepo](#4-estrutura-do-monorepo)
5. [Blockchain e Smart Contract](#5-blockchain-e-smart-contract)
6. [Backend — API NestJS](#6-backend--api-nestjs)
7. [Frontend — Next.js](#7-frontend--nextjs)
8. [Packages Compartilhados](#8-packages-compartilhados)
9. [Plataformas Integradas](#9-plataformas-integradas)
10. [Tecnologias — Do Básico ao Avançado](#10-tecnologias--do-básico-ao-avançado)
11. [Banco de Dados](#11-banco-de-dados)
12. [Autenticação e Segurança](#12-autenticação-e-segurança)
13. [Indexer — Sincronização On-Chain](#13-indexer--sincronização-on-chain)
14. [Variáveis de Ambiente](#14-variáveis-de-ambiente)

---

## 1. O Problema e a Solução

### O problema

A cadeia produtiva de produtos florestais não-madeireiros (PFNM) da Amazônia — como o óleo de copaíba — sofre com:

- **Falta de rastreabilidade:** impossível verificar se o produto veio realmente de onde diz vir
- **Documentação falsificável:** laudos e licenças em papel são facilmente adulterados
- **Ausência de custódia auditável:** não há registro imutável de quem possuiu o produto em cada etapa
- **Exclusão de comunidades:** sistemas complexos dificultam a participação de produtores extrativistas

### A solução SELVA

```
  PRODUTOR                  INTERMEDIÁRIO              CONSUMIDOR / EMPRESA
     │                           │                            │
     │  addProduct()             │  transferProduct()         │  getProductHistory()
     │  ─────────────────────►  │  ─────────────────────►   │  ◄────────────────
     │                           │                            │
     └──────────── Polygon Amoy Blockchain ──────────────────┘
                   (imutável, público, auditável)
```

Cada lote recebe uma identidade on-chain registrada na blockchain Polygon. A cadeia de custódia — de quem produziu, para quem transferiu, em qual condição — é gravada permanentemente e verificável por qualquer pessoa, sem intermediários.

---

## 2. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USUÁRIO FINAL                                 │
│                    (Browser + MetaMask wallet)                          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    apps/web         │
                    │  Next.js 15         │
                    │  wagmi + viem       │  ◄── lê/escreve diretamente
                    │  TailwindCSS        │      na blockchain via MetaMask
                    └──────┬──────┬───────┘
                           │      │
              API calls    │      │  tx diretas (MetaMask)
              (JWT auth)   │      │
                    ┌──────▼──┐   │
                    │ apps/api │   │
                    │ NestJS   │   │
                    │ Prisma   │   │
                    └──┬───┬──┘   │
                       │   │      │
           ┌───────────▼┐  │  ┌───▼──────────────────┐
           │  Supabase  │  │  │   Polygon Amoy        │
           │ PostgreSQL │  │  │   Blockchain          │
           │            │  │  │   (smart contract)    │
           └────────────┘  │  └──────────┬────────────┘
                           │             │
                    ┌──────▼─────────────▼──────┐
                    │   IndexerService           │
                    │   (cron 30s)               │
                    │   escuta eventos on-chain  │
                    │   → persiste no PostgreSQL │
                    └───────────────────────────┘
```

### Princípio de separação de responsabilidades

| Operação | Quem executa | Motivo |
|---|---|---|
| `registerUser` | Usuário via MetaMask | Auto-soberania — o usuário controla sua própria identidade |
| `addProduct` | Produtor via MetaMask | O produtor assina digitalmente a origem do lote |
| `transferProduct` | Dono atual via MetaMask | Somente o detentor da custódia pode transferi-la |
| `makeProducer` | Backend com chave admin | Operação administrativa controlada — previne spam |
| `deactivateProduct` | Backend com chave admin | Operação administrativa controlada |

---

## 3. Fluxos Principais

### 3.1 Fluxo de Autenticação

```
Browser                    apps/api               Upstash Redis
   │                          │                        │
   │  POST /api/auth/nonce    │                        │
   │  { address: "0x..." }    │                        │
   │ ─────────────────────►  │                        │
   │                          │  SET nonce:0x...       │
   │                          │  (TTL: 5 minutos)      │
   │                          │ ──────────────────►   │
   │  { nonce: "abc123" }     │                        │
   │ ◄─────────────────────  │                        │
   │                          │                        │
   │  [MetaMask assina]        │                        │
   │  "SELVA nonce: abc123"    │                        │
   │                          │                        │
   │  POST /api/auth/verify   │                        │
   │  { address, signature }  │                        │
   │ ─────────────────────►  │                        │
   │                          │  ethers.verifyMessage()│
   │                          │  GET nonce:0x...       │
   │                          │ ──────────────────►   │
   │                          │  DEL nonce:0x... (OTP) │
   │                          │ ──────────────────►   │
   │  { token: "eyJ..." }     │                        │
   │ ◄─────────────────────  │                        │
   │                          │                        │
   │  [JWT armazenado]         │                        │
   │  localStorage             │                        │
```

**Por que usar nonce com TTL?**
O nonce é uma string aleatória de uso único. Sem ele, um atacante poderia capturar uma assinatura e reutilizá-la para autenticar em nome de outro usuário (replay attack). O TTL de 5 min e a exclusão após uso tornam isso impossível.

---

### 3.2 Fluxo de Registro de Lote

```
Produtor (browser)          Blockchain (Polygon)       Indexer (api)
       │                           │                        │
       │  writeContract()          │                        │
       │  addProduct(...)          │                        │
       │ ─────────────────────►  │                        │
       │                           │  emit ProductAdded()   │
       │  txHash                   │ ──────── (evento) ──►  │  (até 30s)
       │ ◄─────────────────────  │                        │
       │                           │                        │  upsert Product
       │                           │                        │  insert Trace(CREATED)
       │                           │                        │  update SyncState.lastBlock
       │                           │                        │
       │  GET /api/products/:lotId │                        │
       │ ─────────────────────────────────────────────►   │
       │  { lotId, volume, ... }   │                        │
       │ ◄─────────────────────────────────────────────   │
```

---

### 3.3 Fluxo de Rastreabilidade Pública

```
Qualquer pessoa
      │
      │  GET /api/products/:lotId/history
      │ ──────────────────────────────────►  apps/api
      │                                          │
      │                                          │  SELECT traces WHERE productId = ...
      │                                          │ ──────────────────►  PostgreSQL
      │                                          │
      │  [{ action: "CREATED", actor, ts },      │
      │   { action: "TRANSFERRED", from, to },   │
      │   ...]                                   │
      │ ◄──────────────────────────────────────  │
      │
      │  [link no Polygonscan para cada txHash]
      │  qualquer pessoa pode verificar on-chain
```

---

## 4. Estrutura do Monorepo

```
blockchain-system/                 ← raiz do monorepo
│
├── apps/                          ← aplicações executáveis
│   ├── web/                       ← @selva/web (Next.js 15)
│   │   ├── src/
│   │   │   ├── app/               ← App Router (rotas = pastas)
│   │   │   │   ├── (app)/         ← grupo de rotas autenticadas
│   │   │   │   │   ├── layout.tsx ← verifica auth, renderiza sidebar
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── products/
│   │   │   │   │   └── admin/
│   │   │   │   ├── auth/          ← página pública de login
│   │   │   │   └── page.tsx       ← landing page
│   │   │   ├── components/
│   │   │   │   ├── ui/            ← Button, Card, Badge, Input, Label
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── WalletStatus.tsx
│   │   │   │   ├── NetworkGuard.tsx
│   │   │   │   └── Providers.tsx
│   │   │   ├── contracts/
│   │   │   │   └── abi.ts         ← ABI como const (type inference wagmi)
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts     ← conectar, assinar, JWT, logout
│   │   │   ├── lib/
│   │   │   │   ├── api.ts         ← cliente fetch tipado + 401 redirect
│   │   │   │   └── wagmi.ts       ← config wagmi + defineChain Polygon Amoy
│   │   │   ├── middleware.ts      ← proteção de rotas via cookie
│   │   │   └── styles/
│   │   │       └── globals.css    ← dark theme + variáveis SELVA
│   │   └── next.config.ts         ← webpack stubs para peer deps wagmi
│   │
│   └── api/                       ← @selva/api (NestJS 10)
│       ├── prisma/
│       │   └── schema.prisma      ← modelos: User, Product, Trace, SyncState
│       └── src/
│           ├── modules/
│           │   ├── auth/          ← nonce + verify + JWT + guards
│           │   ├── users/         ← CRUD de usuários
│           │   ├── producers/     ← promoção + listagem
│           │   ├── products/      ← lotes + histórico
│           │   └── blockchain/    ← provider + indexer cron
│           ├── prisma/
│           │   └── prisma.service.ts
│           └── main.ts            ← bootstrap, swagger, cors, prefix /api
│
├── blockchain/                    ← @selva/blockchain (Hardhat)
│   ├── contracts/
│   │   └── SELVATraceability.sol  ← contrato principal
│   ├── scripts/
│   │   └── deploy.ts              ← deploy na rede Amoy
│   ├── test/
│   │   └── SELVATraceability.test.ts  ← 36 testes (100% passing)
│   └── hardhat.config.ts
│
├── packages/                      ← libs internas compartilhadas
│   ├── types/                     ← @selva/types
│   │   └── src/
│   │       ├── abis/
│   │       │   └── SELVATraceability.json  ← ABI extraída do artifact
│   │       └── index.ts           ← DTOs, tipos de contrato, enums
│   ├── shared/                    ← @selva/shared
│   │   └── src/
│   │       └── index.ts           ← utilitários, constantes de rede
│   └── config/                    ← @selva/config
│       └── tsconfig.base.json     ← tsconfig compartilhado
│
├── turbo.json                     ← pipelines: dev, build, lint, test
├── pnpm-workspace.yaml            ← define workspaces do monorepo
├── .env.example                   ← template de variáveis de ambiente
├── PROJECT.md                     ← este documento
├── README.md                      ← guia de início rápido
└── TASKS.md                       ← gestão de tarefas do MVP
```

---

## 5. Blockchain e Smart Contract

### O que é blockchain e por que Polygon?

**Blockchain** é um banco de dados distribuído onde os dados são gravados em blocos encadeados criptograficamente. Uma vez gravado, nenhum dado pode ser alterado sem invalidar todos os blocos seguintes — o que garante imutabilidade.

**Polygon** é uma rede compatível com Ethereum (EVM) que oferece:
- Transações em ~2 segundos (vs ~12s no Ethereum)
- Gas fees em centavos de dólar (vs dezenas de dólares no Ethereum)
- Segurança equivalente ao Ethereum
- Ecossistema maduro com MetaMask, Alchemy, Polygonscan

**Amoy Testnet** é a rede de testes da Polygon — funciona identicamente à mainnet, mas com MATIC sem valor real (obtido em faucets). Usada para desenvolvimento e MVP.

---

### Smart Contract: `SELVATraceability.sol`

O contrato é o **núcleo imutável do sistema**. Uma vez deployado, seu código não pode ser alterado — garantindo que as regras de negócio são fixas e auditáveis.

#### Structs (estruturas de dados on-chain)

```
╔══════════════════════════════╗
║           User               ║
╠══════════════════════════════╣
║ name        → string         ║  nome completo
║ cpf         → string         ║  CPF do usuário
║ account     → address        ║  carteira Ethereum
║ isProducer  → bool           ║  tem permissão de produtor?
║ createdAt   → uint256        ║  timestamp Unix
╚══════════════════════════════╝

╔══════════════════════════════╗
║          Product             ║
╠══════════════════════════════╣
║ lotId        → string        ║  ID único (ex: "COPA-2025-001")
║ volume       → uint256       ║  volume em litros
║ origin       → string        ║  espécie + localização
║ producer     → address       ║  quem produziu (imutável)
║ currentOwner → address       ║  quem possui agora
║ documentHash → bytes32       ║  SHA-256 da licença/doc
║ createdAt    → uint256       ║  timestamp do bloco
║ active       → bool          ║  lote ativo ou desativado
╚══════════════════════════════╝

╔══════════════════════════════╗
║           Trace              ║
╠══════════════════════════════╣
║ actor     → address          ║  quem executou
║ action    → string           ║  CREATED / TRANSFERRED / DEACTIVATED
║ docHash   → bytes32          ║  doc associado à ação
║ from      → address          ║  proprietário anterior
║ to        → address          ║  novo proprietário
║ timestamp → uint256          ║  timestamp do bloco
╚══════════════════════════════╝
```

#### Permissões e funções

```
                    ┌─────────────────────────────┐
                    │     SELVATraceability        │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
       ┌──────▼──────┐    ┌────────▼────────┐   ┌──────▼──────┐
       │  QUALQUER   │    │   PRODUTOR      │   │  OWNER/     │
       │  WALLET     │    │ (isProducer)    │   │  ADMIN      │
       └──────┬──────┘    └────────┬────────┘   └──────┬──────┘
              │                    │                    │
       registerUser()        addProduct()        makeProducer()
       transferProduct()                         deactivateProduct()
       (se dono do lote)
       getProduct()
       getProductHistory()
```

#### Eventos (base do indexer)

Eventos são logs gravados na blockchain que o indexer escuta:

```solidity
// Emitido quando um novo usuário se registra
UserRegistered(bytes32 indexed userHash, address indexed userAddress)

// Emitido quando uma wallet é promovida a produtor
ProducerCreated(address indexed producerAddress)

// Emitido quando um novo lote é registrado
ProductAdded(string indexed lotId, address indexed producer, bytes32 documentHash)

// Emitido quando a custódia de um lote é transferida
OwnershipTransferred(string indexed lotId, address indexed from, address indexed to)
```

#### Hash de documento (bytes32)

O campo `documentHash` armazena o **SHA-256** do arquivo de licença, calculado **no browser do usuário** antes de qualquer upload:

```
arquivo PDF/imagem
      │
      │  crypto.subtle.digest('SHA-256', buffer)
      ▼
  0x3a4f... (32 bytes = 64 chars hex)
      │
      │  armazenado no contrato (imutável)
      ▼
  qualquer pessoa pode verificar:
  pegar o arquivo, calcular SHA-256, comparar com o hash on-chain
```

---

## 6. Backend — API NestJS

### Arquitetura de módulos

```
apps/api/src/
│
├── AppModule
│   ├── ConfigModule (global)     ← variáveis de ambiente tipadas
│   ├── PrismaModule (global)     ← cliente de banco injetável
│   ├── ScheduleModule            ← habilita cron jobs
│   │
│   ├── AuthModule
│   │   ├── AuthController        ← POST /api/auth/nonce
│   │   │                            POST /api/auth/verify
│   │   ├── AuthService           ← lógica: nonce Redis, verify, JWT
│   │   ├── JwtStrategy           ← Passport: valida Bearer token
│   │   └── Guards
│   │       ├── JwtAuthGuard      ← @UseGuards(JwtAuthGuard)
│   │       └── RolesGuard        ← @Roles('admin') / @Roles('producer')
│   │
│   ├── UsersModule
│   │   ├── UsersController       ← GET /api/users
│   │   │                            GET /api/users/me
│   │   │                            GET /api/users/:address
│   │   └── UsersService          ← queries Prisma
│   │
│   ├── ProducersModule
│   │   ├── ProducersController   ← GET /api/producers
│   │   │                            POST /api/producers/:address/promote
│   │   └── ProducersService      ← chama makeProducer() on-chain + DB
│   │
│   ├── ProductsModule
│   │   ├── ProductsController    ← GET /api/products
│   │   │                            GET /api/products/:lotId
│   │   │                            GET /api/products/:lotId/history
│   │   │                            DELETE /api/products/:lotId
│   │   └── ProductsService       ← queries Prisma + deactivateProduct()
│   │
│   └── BlockchainModule
│       ├── BlockchainService     ← provider Alchemy + signer admin + contrato
│       └── IndexerService        ← cron 30s: lê eventos → upsert no DB
```

---

### Como o NestJS organiza o código

O NestJS usa **injeção de dependência** — cada módulo declara o que fornece e o que precisa. O framework monta tudo automaticamente:

```typescript
// Exemplo: ProducersService precisa do BlockchainService e do PrismaService
// NestJS os injeta automaticamente no construtor

@Injectable()
export class ProducersService {
  constructor(
    private readonly blockchain: BlockchainService,  // injeta
    private readonly prisma: PrismaService,          // injeta
  ) {}

  async promote(address: string) {
    await this.blockchain.makeProducer(address);      // chama contrato
    await this.prisma.user.update({ ... });           // atualiza DB
  }
}
```

---

## 7. Frontend — Next.js

### App Router e grupos de rotas

O Next.js 15 usa o **App Router** — cada pasta dentro de `app/` é uma rota. Parênteses criam **grupos** que não aparecem na URL:

```
app/
├── (app)/              ← grupo: rotas autenticadas (não vira /app na URL)
│   ├── layout.tsx      ← verifica JWT, renderiza sidebar
│   ├── dashboard/
│   │   └── page.tsx    ← /dashboard
│   ├── products/
│   │   ├── page.tsx    ← /products
│   │   ├── new/
│   │   │   └── page.tsx    ← /products/new
│   │   └── [lotId]/        ← parâmetro dinâmico
│   │       ├── page.tsx    ← /products/COPA-001
│   │       └── transfer/
│   │           └── page.tsx  ← /products/COPA-001/transfer
│   └── admin/
│       └── users/
│           └── page.tsx  ← /admin/users
├── auth/
│   └── page.tsx        ← /auth (pública)
└── page.tsx            ← / (landing, pública)
```

### middleware.ts

Executa **antes** de cada request no servidor. Verifica se há token no cookie e redireciona para `/auth` se a rota for protegida — sem precisar de JS no cliente:

```
Request: GET /dashboard
         │
         ▼ middleware.ts
    tem cookie selva_token?
    ├── SIM → passa a request normalmente
    └── NÃO → redirect 307 para /auth
```

### wagmi + viem

**wagmi** é a camada React para interagir com wallets e contratos. **viem** é a biblioteca de baixo nível que wagmi usa:

```
Componente React
      │
      │  useWriteContract()    ← hook wagmi
      ▼
    wagmi config
      │
      │  metaMask() connector  ← abre MetaMask no browser
      ▼
    viem / ethers
      │
      │  encode calldata, sign tx
      ▼
   Polygon Amoy RPC (Alchemy)
      │
      ▼
   Blockchain
```

### Componentes UI customizados

Ao invés de instalar uma biblioteca completa, os componentes seguem o padrão **CVA (Class Variance Authority)** para variantes:

```
Button
  ├── variant: default | outline | ghost | destructive | secondary
  ├── size: sm | md | lg | icon
  └── loading: boolean (spinner inline)

Card
  ├── CardHeader
  ├── CardTitle
  └── CardContent

Badge
  ├── variant: default (verde SELVA) | secondary (cinza)

Input / Label  ← campos de formulário
```

---

## 8. Packages Compartilhados

### `@selva/types`

Fonte única de verdade para tipos TypeScript. Importado tanto pela API quanto pelo frontend:

```typescript
// Tipos que espelham o contrato Solidity
export interface ContractUser {
  name: string;
  cpf: string;
  account: `0x${string}`;
  isProducer: boolean;
  createdAt: bigint;
}

export interface ContractProduct {
  lotId: string;
  volume: bigint;
  origin: string;
  producer: `0x${string}`;
  currentOwner: `0x${string}`;
  documentHash: `0x${string}`;
  createdAt: bigint;
  active: boolean;
}

// DTOs da API (o que o backend retorna)
export interface UserDto { ... }
export interface ProductDto { ... }
export interface TraceDto { ... }
export interface PaginatedResponse<T> { data: T[]; total: number; page: number }

// ABI do contrato (usado por wagmi e ethers)
export { SELVA_ABI } from './abis/SELVATraceability.json'
```

### `@selva/shared`

Utilitários e constantes usados em múltiplos apps:

```typescript
// Constantes de rede
export const POLYGON_AMOY = {
  chainId: 80002,
  rpcUrl: 'https://polygon-amoy.g.alchemy.com/v2/',
  explorer: 'https://amoy.polygonscan.com',
}

// Utilitários de formatação
export const shortenAddress = (addr: string, chars = 4) =>
  `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`
// "0x1234...5678"

export const formatTimestamp = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString('pt-BR')
```

### `@selva/config`

`tsconfig.base.json` compartilhado — todos os apps estendem este arquivo, garantindo consistência de compilação TypeScript em todo o monorepo.

---

## 9. Plataformas Integradas

### Polygon (blockchain)

```
┌────────────────────────────────────────────────────────┐
│  POLYGON NETWORK                                       │
│                                                        │
│  Mainnet (produção)   chainId: 137                     │
│  Amoy Testnet (dev)   chainId: 80002   ◄── SELVA MVP  │
│                                                        │
│  EVM-compatible: mesmo código Solidity do Ethereum     │
│  Consenso: Proof of Stake (validadores)                │
│  Finality: ~2 segundos                                 │
│  Gas fee: ~$0.001 por transação                        │
└────────────────────────────────────────────────────────┘
```

### Alchemy

Provedor de RPC (Remote Procedure Call) — o "roteador" entre o código e a blockchain:

```
apps/api  ──►  Alchemy RPC  ──►  Polygon node  ──►  Blockchain
apps/web  ──►  Alchemy RPC  ──►  Polygon node  ──►  Blockchain

Alchemy oferece:
  • 300M compute units/mês (plano free)
  • Rate limit: 330 requests/segundo
  • Retry automático
  • Logs e métricas de uso
  • Webhook de eventos (usado indiretamente via polling)
```

**Por que não usar RPC público?**
RPCs públicos (como `rpc.ankr.com/polygon_mumbai`) têm limites severos e instabilidade. Alchemy garante disponibilidade de 99.9% e limites adequados para produção.

### Supabase (PostgreSQL)

```
┌──────────────────────────────────────────────────────────┐
│  SUPABASE                                                │
│                                                          │
│  PostgreSQL 15 gerenciado em nuvem (AWS us-east-2)       │
│                                                          │
│  DATABASE_URL    → pooler PgBouncer (conexões da API)    │
│  DIRECT_URL      → conexão direta (migrations Prisma)    │
│                                                          │
│  Por que dois URLs?                                      │
│  O PgBouncer multiplexexa conexões — ideal para API      │
│  com muitos requests. Migrations precisam de conexão     │
│  direta (comandos DDL não funcionam com pooler).         │
└──────────────────────────────────────────────────────────┘
```

### Upstash Redis

Redis serverless via REST API — usado exclusivamente para armazenar nonces de autenticação:

```
POST /auth/nonce  →  SET "nonce:0x123..." "abc123" EX 300
POST /auth/verify →  GET "nonce:0x123..." → valida → DEL "nonce:0x123..."

Por que serverless?
  • Sem servidor para manter
  • Paga apenas pelo uso (requests)
  • Escala automaticamente
  • REST API: funciona em qualquer ambiente (inclusive edge/serverless)
```

### MetaMask

Carteira digital que permite ao usuário:
- Gerenciar chaves privadas com segurança (nunca expostas ao site)
- Assinar mensagens (autenticação SELVA)
- Aprovar e assinar transações (registrar lotes, transferir)
- Trocar de rede (verificado pelo `NetworkGuard`)

```
┌──────────────────────────────────────────────────────────┐
│  MetaMask (extensão do browser)                          │
│                                                          │
│  Chave privada  →  NUNCA sai do MetaMask                 │
│  Chave pública  →  endereço 0x... (identidade)           │
│                                                          │
│  Assinar mensagem:  "SELVA nonce: abc123"                │
│    → prova que você controla a chave sem revelar ela     │
│                                                          │
│  Assinar transação: addProduct(...)                      │
│    → autoriza a execução do contrato on-chain            │
└──────────────────────────────────────────────────────────┘
```

### Polygonscan (Amoy)

Block explorer público. Cada transação do SELVA tem um link direto:

```
https://amoy.polygonscan.com/tx/0xabc123...

Mostra:
  • status da transação (sucesso / falha)
  • bloco e timestamp
  • gas usado e custo
  • input data (parâmetros da função chamada)
  • logs de eventos emitidos
```

O frontend exibe esses links no histórico de rastreabilidade, permitindo que qualquer pessoa verifique independentemente.

---

## 10. Tecnologias — Do Básico ao Avançado

### Fundamentos

| Tecnologia | O que é | Uso no SELVA |
|---|---|---|
| **TypeScript** | JavaScript com tipos estáticos — detecta erros em tempo de compilação | Todo o projeto: frontend, backend, blockchain |
| **Node.js** | Runtime JavaScript fora do browser | Backend (NestJS) e ferramentas de build |
| **pnpm** | Gerenciador de pacotes mais eficiente que npm/yarn | Instala dependências de todo o monorepo |
| **Git** | Controle de versão | Histórico e colaboração |

### Infraestrutura do Monorepo

| Tecnologia | O que é | Uso no SELVA |
|---|---|---|
| **pnpm Workspaces** | Permite múltiplos packages em um único repositório | Liga `apps/*` e `packages/*` |
| **Turborepo** | Orquestrador de builds com cache inteligente | `pnpm dev` inicia tudo em paralelo; `pnpm build` com cache |

**Como o Turborepo ajuda:**
```
Sem Turbo:                    Com Turbo:
pnpm --filter web dev   →     pnpm dev
pnpm --filter api dev   →       └── roda web + api em paralelo
(dois terminais)                └── cache: se nada mudou, não recompila
```

### Frontend

| Tecnologia | O que é | Uso no SELVA |
|---|---|---|
| **React 19** | Biblioteca de UI com componentes | Base de tudo no frontend |
| **Next.js 15** | Framework React com SSR, App Router, otimizações | Roteamento, SSR, middleware |
| **TailwindCSS v4** | CSS utilitário via classes | Estilização (dark theme, layout, animações) |
| **framer-motion** | Biblioteca de animações para React | Timeline de rastreabilidade, fade-in de cards |
| **lucide-react** | Ícones SVG como componentes React | Ícones do sistema (ShieldCheck, Package, etc.) |
| **wagmi v3** | Hooks React para wallets e contratos EVM | `useWriteContract`, `useAccount`, `useBalance` |
| **viem v2** | Biblioteca TypeScript para Ethereum (base do wagmi) | Encoding de tx, `isAddress`, `formatUnits` |
| **@tanstack/react-query** | Cache e sincronização de dados assíncronos | Requerido pelo wagmi para cache de queries |

### Backend

| Tecnologia | O que é | Uso no SELVA |
|---|---|---|
| **NestJS 10** | Framework Node.js modular e testável (inspirado no Angular) | Estrutura de módulos, DI, decorators |
| **Prisma ORM** | ORM moderno com schema-first e type safety | Queries ao PostgreSQL com tipos automáticos |
| **Passport.js** | Middleware de autenticação para Node.js | Estratégia JWT + Guards |
| **class-validator** | Validação de DTOs via decorators | Valida payloads da API antes do controller |
| **@nestjs/schedule** | Cron jobs integrados ao NestJS | Indexer: roda a cada 30 segundos |
| **ethers.js v6** | Biblioteca JavaScript para Ethereum | Backend: `verifyMessage`, signer admin, chamar contrato |

### Blockchain

| Tecnologia | O que é | Uso no SELVA |
|---|---|---|
| **Solidity ^0.8.17** | Linguagem de smart contracts EVM | O contrato `SELVATraceability.sol` |
| **Hardhat** | Framework de desenvolvimento Ethereum | Compilar, testar, fazer deploy do contrato |
| **@nomicfoundation/hardhat-toolbox** | Suite de plugins Hardhat (ethers, chai, coverage) | Testes com `loadFixture`, `expect` |
| **ABI (Application Binary Interface)** | Descrição das funções do contrato em JSON | Interface entre código JS e contrato on-chain |

---

## 11. Banco de Dados

### Schema Prisma

```
┌─────────────────────────────────┐
│              User               │
├─────────────────────────────────┤
│ id              String (cuid)   │
│ userHash        String @unique  │ ← bytes32 do contrato
│ name            String          │
│ cpf             String          │
│ walletAddress   String @unique  │ ← chave primária on-chain
│ isProducer      Boolean         │
│ isAdmin         Boolean         │
│ onChainAt       DateTime        │ ← timestamp do bloco de registro
│ syncedAt        DateTime        │ ← quando o indexer processou
└─────────────────────────────────┘

┌─────────────────────────────────┐
│            Product              │
├─────────────────────────────────┤
│ id                  String      │
│ lotId               String @unique │ ← ID único do lote
│ volume              Int         │
│ origin              String      │
│ producerAddress     String      │
│ currentOwnerAddress String      │
│ documentHash        String?     │
│ active              Boolean     │
│ onChainAt           DateTime    │
│ syncedAt            DateTime    │
│ traces              Trace[]     │ ← relação 1:N
└─────────────────────────────────┘

┌─────────────────────────────────┐
│             Trace               │
├─────────────────────────────────┤
│ id             String           │ ← ID composto: "COPA-001-CREATED"
│ productId      String           │ ← FK para Product
│ actor          String           │ ← quem executou
│ action         String           │ ← CREATED | TRANSFERRED | DEACTIVATED
│ docHash        String?          │
│ fromAddress    String?          │
│ toAddress      String?          │
│ blockTimestamp DateTime         │
│ txHash         String?          │ ← link para Polygonscan
│ blockNumber    BigInt?          │
│ createdAt      DateTime         │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│           SyncState             │
├─────────────────────────────────┤
│ id        Int @id @default(1)   │ ← sempre 1 registro
│ lastBlock BigInt @default(0)    │ ← último bloco processado
└─────────────────────────────────┘
```

### Por que espelhar on-chain no PostgreSQL?

```
Consulta direta na blockchain:
  • Cada query = 1+ chamada RPC ao Alchemy
  • Rate limiting: 330 req/s (Alchemy free)
  • Sem filtros avançados (paginação, busca por texto)
  • Lento para listas grandes

Com PostgreSQL (indexado):
  • Consulta local = milissegundos
  • Filtros SQL arbitrários
  • Paginação nativa
  • Sem rate limiting
  • Backup e analytics inclusos
```

---

## 12. Autenticação e Segurança

### Por que assinar com a carteira ao invés de senha?

No modelo tradicional:
```
usuário → "minha senha é abc123" → servidor armazena hash
```

No modelo Web3 (SELVA):
```
usuário → "vou provar que controlo 0x1234... sem revelar minha chave privada"
        → assina nonce com chave privada
        → servidor verifica a assinatura matematicamente
        → IMPOSSÍVEL falsificar sem ter a chave privada
```

Isso elimina:
- Banco de dados de senhas (que podem ser hackeados)
- Reset de senha via e-mail
- Problemas de reutilização de senha

### JWT (JSON Web Token)

Após verificar a assinatura, a API retorna um JWT:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9   ← header (base64)
.eyJhZGRyZXNzIjoiMHgxMjM0Li4uIiwiaXNBZG1pbiI6ZmFsc2V9  ← payload
.SIGNATURE                               ← assinatura HMAC-SHA256

Payload decodificado:
{
  "address": "0x1234...",
  "isAdmin": false,
  "isProducer": true,
  "iat": 1716300000,  ← issued at
  "exp": 1716904800   ← expira em 7 dias
}
```

O frontend envia o JWT no header de cada request:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Guards no NestJS

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)          // ← bloqueia se sem JWT válido
async getMe(@Request() req) { ... }

@Post(':address/promote')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')                    // ← bloqueia se não for admin
async promote(@Param('address') address: string) { ... }
```

---

## 13. Indexer — Sincronização On-Chain

O indexer é o **"ouvinte"** que mantém o PostgreSQL sincronizado com a blockchain.

### Como funciona

```
                    ┌─────────────────────────────────────┐
                    │         IndexerService               │
                    │  @Cron(EVERY_30_SECONDS)            │
                    └──────────────┬──────────────────────┘
                                   │
              1. Lê SyncState.lastBlock do DB
                                   │
              2. Lê bloco atual da blockchain
                                   │
              3. Divide em chunks de 2000 blocos
                 (limite do plano free Alchemy)
                                   │
              4. Para cada chunk:
                 queryFilter(evento, fromBlock, toBlock)
                                   │
                 ┌─────────────────┴──────────────────────┐
                 │  Processa cada evento encontrado:       │
                 │                                         │
                 │  UserRegistered  → upsert User          │
                 │  ProducerCreated → update User          │
                 │  ProductAdded    → upsert Product       │
                 │                    insert Trace         │
                 │  OwnershipTransferred → update Product  │
                 │                        insert Trace     │
                 └─────────────────────────────────────────┘
                                   │
              5. Atualiza SyncState.lastBlock
```

### Chunking de 2000 blocos

O plano free da Alchemy limita queries de `getLogs` a no máximo **2000 blocos por request**. Se o indexer ficou 10 minutos parado (≈ 300 blocos na Amoy) ou o sistema foi ligado pela primeira vez, ele divide o trabalho:

```
lastBlock = 1.000.000
currentBlock = 1.050.000
deltaBlocks = 50.000

Chunks:
  [1.000.000 → 1.002.000]  request 1
  [1.002.000 → 1.004.000]  request 2
  ...
  [1.048.000 → 1.050.000]  request 25
```

### IDs de Trace compostos

Para garantir idempotência (rodar o indexer duas vezes não duplica dados), os IDs das traces seguem padrões únicos:

```
COPA-001-CREATED                          ← só existe uma vez
COPA-001-TRANSFERRED-0xabc123...txhash    ← único por transação
COPA-001-DEACTIVATED                      ← só existe uma vez
```

`prisma.trace.upsert({ where: { id }, ... })` — se já existe, não duplica.

---

## 14. Variáveis de Ambiente

### `blockchain/.env`

```env
ALCHEMY_API_KEY=          # chave de acesso ao RPC Alchemy
DEPLOYER_PRIVATE_KEY=     # chave privada da wallet de deploy (precisa de MATIC)
POLYGONSCAN_API_KEY=      # para verificar/publicar o código do contrato
```

### `apps/api/.env`

```env
# Banco de dados (Supabase)
DATABASE_URL=             # connection string via PgBouncer (pooler)
DIRECT_URL=               # connection string direta (para migrations)

# Cache de nonces (Upstash)
UPSTASH_REDIS_REST_URL=   # endpoint REST do Redis serverless
UPSTASH_REDIS_REST_TOKEN= # token de autenticação

# Autenticação
JWT_SECRET=               # segredo HMAC para assinar tokens JWT
JWT_EXPIRES_IN=7d         # validade dos tokens

# Blockchain
ALCHEMY_API_KEY=          # mesmo do blockchain (ou app separado)
CONTRACT_ADDRESS=         # endereço do contrato após deploy
ADMIN_PRIVATE_KEY=        # chave privada da wallet administrativa (makeProducer, deactivateProduct)
ADMIN_WALLET_ADDRESS=     # endereço público da wallet administrativa

# Servidor
FRONTEND_URL=http://localhost:3000
PORT=3001
```

### `apps/web/.env.local`

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=    # endereço do contrato após deploy
NEXT_PUBLIC_ALCHEMY_API_KEY=     # chave Alchemy para RPC no frontend
NEXT_PUBLIC_CHAIN_ID=80002       # Polygon Amoy (fixo)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

> **Prefixo `NEXT_PUBLIC_`:** variáveis com este prefixo são expostas ao bundle do browser. Nunca coloque chaves privadas com este prefixo.

---

## Considerações para Apresentação do MVP

### Sobre o gas do testnet

- O deploy do contrato é feito **uma única vez** — após isso, o endereço é fixo
- Operações de usuário (registrar, criar lote, transferir) custam ~0.001–0.005 MATIC cada
- Para uma demo com 3–5 transações, ~0.02 MATIC por wallet é suficiente
- Faucets repõem diariamente: `faucet.polygon.technology`

### Latência das transações

- Envio da tx pelo MetaMask → confirmação na Amoy: **~2–5 segundos**
- Confirmação na blockchain → indexer processar: **até 30 segundos** (cron)
- Para demo: mostrar o txHash no Polygonscan como prova imediata, e atualizar a UI após ~30s

### Dados de demonstração sugeridos

```
Produtor: "Cooperativa Floresta Viva"
Lote: "COPA-DEMO-001"
Volume: 500 litros
Origem: "Copaifera langsdorffii — Comunidade do Rio Negro/AM"
Documento: qualquer PDF (hash calculado no browser)
```

---

*SELVA — selva.eco.br | Rastreabilidade que protege a floresta.*
