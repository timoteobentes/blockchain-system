# SELVA — Sistema Estruturado Legal de Valores Amazônicos

> Plataforma de rastreabilidade blockchain para a cadeia produtiva da Amazônia.  
> Piloto: óleo-resina de copaíba (*Copaifera langsdorffii*).

---

## Visão Geral

O SELVA garante a origem, custódia e autenticidade de produtos florestais não-madeireiros por meio de um smart contract na rede Polygon. Cada lote tem sua identidade registrada on-chain — do produtor até o comprador final — tornando a rastreabilidade imutável, auditável e pública.

**Problema resolvido:** certificar legalmente que um produto amazônico saiu de onde diz ter saído, sem depender de intermediários ou documentos falsificáveis.

---

## Arquitetura

```
blockchain (Polygon Amoy)
        │
        │  eventos (on-chain)
        ▼
  apps/api  ──────────────────────────────────────────────────
  NestJS + Prisma          Indexer (cron 30s)
  Supabase PostgreSQL       escuta eventos → persiste no DB
  Upstash Redis (nonces)    │
        │                   │
        │  REST API          │
        ▼                   │
  apps/web ◄───────────────┘
  Next.js 15 + wagmi
  MetaMask → assina tx diretamente
```

**Fluxo de autenticação:**
1. Usuário conecta MetaMask → frontend pede nonce à API
2. Usuário assina mensagem → API verifica assinatura com `ethers.verifyMessage`
3. API retorna JWT → frontend usa em todas as chamadas subsequentes

**Operações on-chain por quem:**
- **Frontend via MetaMask:** `registerUser`, `addProduct`, `transferProduct`
- **Backend via chave admin:** `makeProducer`, `deactivateProduct`

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Smart Contract | Solidity ^0.8.17, Hardhat, Polygon Amoy |
| Backend | NestJS 10, Prisma ORM, ethers.js v6 |
| Banco de Dados | Supabase (PostgreSQL) |
| Cache / Nonces | Upstash Redis (REST API serverless) |
| Frontend | Next.js 15 App Router, wagmi v3, viem v2 |
| Estilo | TailwindCSS v4, framer-motion, lucide-react |
| Monorepo | pnpm workspaces + Turborepo |

---

## Estrutura do Projeto

```
blockchain-system/
├── apps/
│   ├── web/          # Frontend Next.js 15
│   └── api/          # Backend NestJS
├── blockchain/       # Contratos, scripts de deploy, testes Hardhat
├── packages/
│   ├── types/        # DTOs e ABI TypeScript compartilhados
│   ├── shared/       # Utilitários e constantes
│   └── config/       # tsconfig base
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Pré-requisitos

- **Node.js** >= 20
- **pnpm** >= 9 — `npm install -g pnpm`
- **MetaMask** instalado no browser
- Conta no [Alchemy](https://alchemy.com) (RPC Polygon Amoy)
- Conta no [Supabase](https://supabase.com) (PostgreSQL)
- Conta no [Upstash](https://upstash.com) (Redis serverless)

---

## Configuração do Ambiente

### 1. Clonar e instalar dependências

```bash
git clone <repo-url>
cd blockchain-system
pnpm install
```

### 2. Variáveis de ambiente

Copie os exemplos e preencha conforme a seção [Variáveis de Ambiente](#variáveis-de-ambiente) abaixo:

```bash
cp .env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp blockchain/.env.example blockchain/.env
```

### 3. Banco de dados

```bash
pnpm --filter @selva/api prisma:migrate
```

### 4. Deploy do contrato (Polygon Amoy Testnet)

```bash
# Requer MATIC no faucet: https://faucet.polygon.technology
pnpm --filter @selva/blockchain deploy
# Copie o endereço impresso e preencha CONTRACT_ADDRESS nos .env
```

### 5. Rodar em desenvolvimento

```bash
pnpm dev   # inicia web (3000) + api (3001) em paralelo via Turborepo
```

---

## Variáveis de Ambiente

### `blockchain/.env`

| Variável | Descrição | Onde obter |
|---|---|---|
| `ALCHEMY_API_KEY` | Chave da API Alchemy | [alchemy.com](https://dashboard.alchemy.com) → Create App → Network: Polygon Amoy |
| `DEPLOYER_PRIVATE_KEY` | Chave privada da wallet de deploy | MetaMask → Account Details → Export Private Key |
| `POLYGONSCAN_API_KEY` | Chave para verificar contrato no Polygonscan | [polygonscan.com](https://amoy.polygonscan.com) → My Account → API Keys |

### `apps/api/.env`

| Variável | Descrição | Onde obter |
|---|---|---|
| `DATABASE_URL` | PostgreSQL via PgBouncer (pooled) | Supabase → Project Settings → Database → Connection String → Transaction |
| `DIRECT_URL` | PostgreSQL conexão direta (migrations) | Supabase → Project Settings → Database → Connection String → Session |
| `UPSTASH_REDIS_REST_URL` | Endpoint REST do Redis | [upstash.com](https://console.upstash.com) → Create Database → REST API → UPSTASH_REDIS_REST_URL |
| `UPSTASH_REDIS_REST_TOKEN` | Token de autenticação do Redis | Mesmo painel → UPSTASH_REDIS_REST_TOKEN |
| `JWT_SECRET` | Segredo de assinatura dos tokens JWT | Gere localmente: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Validade do JWT | Padrão: `7d` |
| `ALCHEMY_API_KEY` | Mesmo do blockchain (ou app separado) | Alchemy Dashboard |
| `CONTRACT_ADDRESS` | Endereço do contrato deployado | Impresso pelo script de deploy |
| `ADMIN_PRIVATE_KEY` | Chave privada da wallet administrativa | MetaMask → Export Private Key (wallet diferente do deploy) |
| `ADMIN_WALLET_ADDRESS` | Endereço público da wallet admin | Endereço `0x...` visível no MetaMask |
| `FRONTEND_URL` | URL do frontend (CORS) | `http://localhost:3000` em dev; URL da Vercel em prod |
| `PORT` | Porta da API | Padrão: `3001` |

### `apps/web/.env.local`

| Variável | Descrição | Onde obter |
|---|---|---|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Endereço do contrato deployado | Impresso pelo script de deploy |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Chave Alchemy para o RPC no frontend | Alchemy Dashboard (pode ser o mesmo app) |
| `NEXT_PUBLIC_CHAIN_ID` | ID da rede | `80002` (Polygon Amoy) — não alterar |
| `NEXT_PUBLIC_API_URL` | URL base da API | `http://localhost:3001` em dev |

> **Segurança:** nunca suba arquivos `.env` para o repositório. O `.gitignore` já está configurado para ignorá-los.

---

## Scripts Disponíveis

```bash
# Raiz (via Turborepo)
pnpm dev              # inicia todos os apps em modo watch
pnpm build            # build de produção de todos os apps
pnpm lint             # lint em todos os packages
pnpm test             # testes em todos os packages

# Blockchain
pnpm --filter @selva/blockchain test      # 36 testes do contrato
pnpm --filter @selva/blockchain deploy    # deploy na Amoy

# API
pnpm --filter @selva/api prisma:migrate   # aplica migrations no Supabase
pnpm --filter @selva/api prisma:studio    # abre Prisma Studio (UI do banco)

# Frontend
pnpm --filter @selva/web build            # build de produção Next.js
```

---

## Módulos da API

| Endpoint | Método | Autenticação | Descrição |
|---|---|---|---|
| `/api/auth/nonce` | POST | — | Gera nonce para assinar |
| `/api/auth/verify` | POST | — | Verifica assinatura, retorna JWT |
| `/api/users` | GET | JWT | Lista usuários paginada |
| `/api/users/me` | GET | JWT | Perfil do usuário autenticado |
| `/api/producers` | GET | JWT | Lista produtores |
| `/api/producers/:address/promote` | POST | JWT + Admin | Promove usuário a produtor |
| `/api/products` | GET | JWT | Lista lotes com filtros |
| `/api/products/:lotId` | GET | JWT | Detalhes do lote |
| `/api/products/:lotId/history` | GET | JWT | Histórico de rastreabilidade |
| `/api/products/:lotId` | DELETE | JWT + Admin | Desativa lote |

Documentação Swagger disponível em `http://localhost:3001/api/docs`.

---

## Smart Contract

**`SELVATraceability.sol`** — deployado na Polygon Amoy Testnet

| Função | Quem chama | Descrição |
|---|---|---|
| `registerUser(name, cpf)` | Usuário (MetaMask) | Registra wallet na plataforma |
| `makeProducer(address)` | Owner/Admin | Concede role de produtor |
| `addProduct(lotId, volume, origin, docHash)` | Produtor (MetaMask) | Registra lote on-chain |
| `transferProduct(lotId, newOwner)` | Dono atual (MetaMask) | Transfere custódia |
| `deactivateProduct(lotId)` | Owner/Admin | Desativa lote |

Eventos indexados: `UserRegistered`, `ProducerCreated`, `ProductAdded`, `OwnershipTransferred`.

Testes: **36/36 passando** — cobertura completa de funções, eventos, permissões e fluxo E2E.

---

## Roadmap pós-MVP

- Upload de documentos para IPFS (hash verificável on-chain)
- QR Code por lote para rastreabilidade offline
- Notificações em transferências (e-mail / WhatsApp)
- Relatórios de rastreabilidade em PDF
- Suporte a múltiplos produtos florestais
- Deploy na Polygon Mainnet

---

## Licença

Propriedade de **SELVA — selva.eco.br**. Todos os direitos reservados.
