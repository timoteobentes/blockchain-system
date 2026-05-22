# SELVA — Gestão de Tarefas do MVP

Legenda: `[ ]` pendente · `[~]` em progresso · `[x]` concluído · `[-]` bloqueado

---

## Fase 0 — Fundação e Documentação

- [x] Definir stack tecnológica
- [x] Escrever contrato inteligente `SELVATraceability.sol`
- [x] Criar `PROJECT.md` com documentação do projeto
- [x] Criar `TASKS.md` para gestão de tarefas
- [ ] Criar `.env.example` com todas as variáveis necessárias
- [ ] Criar `CLAUDE.md` com guia de contribuição ao projeto

---

## Fase 1 — Infraestrutura do Monorepo

> **Nota:** Docker removido. PostgreSQL via Supabase (cloud). Redis via Upstash (serverless, sem infra local).

- [x] **1.1** Inicializar `pnpm-workspace.yaml` na raiz
- [x] **1.2** Configurar Turborepo (`turbo.json`) com pipelines `dev`, `build`, `lint`, `test`
- [x] **1.3** Criar `packages/config/` com `tsconfig.base.json`
- [x] **1.4** Criar `packages/types/` com tipos TypeScript compartilhados (DTOs, ABI types)
- [x] **1.5** Criar `packages/shared/` com utilitários (formatação, constantes de contrato e rede)
- [x] **1.6** Migrar frontend existente (`src/`) para `apps/web/`
- [x] **1.7** Criar `blockchain/hardhat.config.ts` e `blockchain/scripts/deploy.ts`
- [x] **1.8** Criar `.env.example` com todas as variáveis (web, api, blockchain)
- [x] **1.9** Atualizar `.gitignore` para monorepo (Turbo, Hardhat artifacts, pnpm)
- [x] **1.10** Instalar dependências com pnpm: `pnpm install` na raiz
- [x] **1.11** Validar build do frontend (`pnpm --filter @selva/web build`) — 5 páginas estáticas OK

---

## Fase 2 — Blockchain / Smart Contract

- [x] **2.1** Mover `smart-contract.sol` para `blockchain/contracts/SELVATraceability.sol`
- [x] **2.2** Inicializar projeto Hardhat em `blockchain/` com TypeScript (`tsconfig.json`)
- [x] **2.3** Instalar dependências: `hardhat`, `@nomicfoundation/hardhat-toolbox`, `dotenv`
- [x] **2.4** Configurar `hardhat.config.ts` com rede Polygon Amoy (via Alchemy RPC)
- [x] **2.5** Escrever testes em `blockchain/test/SELVATraceability.test.ts`:
  - [x] `registerUser` — 8 casos (registro, eventos, persistência, rejeições)
  - [x] `makeProducer` — 5 casos (promoção, not owner, zero address, não registrado, duplicado)
  - [x] `addProduct` — 7 casos (criação, eventos, histórico CREATED, rejeições)
  - [x] `transferProduct` — 7 casos (transferência, encadeamento, não-dono, inativo)
  - [x] `deactivateProduct` — 3 casos (desativação, not owner, inexistente)
  - [x] `getProductHistory` — arrays paralelos e timestamps crescentes
  - [x] Fluxo E2E completo — registro → promoção → lote → transferência → rastreabilidade
- [x] **2.6** Rodar testes localmente: **36/36 passando** em 1s
- [x] **2.7** Escrever script de deploy em `blockchain/scripts/deploy.ts`
- [ ] **2.8** Criar `blockchain/.env` com `ALCHEMY_API_KEY` e `DEPLOYER_PRIVATE_KEY`
- [ ] **2.9** Fazer deploy na Polygon Amoy Testnet (requer MATIC no faucet)
- [ ] **2.10** Verificar e publicar contrato no Polygonscan Amoy
- [x] **2.11** Exportar ABI para `packages/types/src/abis/SELVATraceability.json`
- [ ] **2.12** Registrar endereço do contrato deployado nas variáveis de ambiente

---

## Fase 3 — Backend / API (NestJS)

### 3.1 — Setup Inicial
- [x] **3.1.1** Inicializar projeto NestJS em `apps/api/` (`package.json`, `nest-cli.json`)
- [x] **3.1.2** Configurar TypeScript (`tsconfig.json`, `tsconfig.build.json`)
- [x] **3.1.3** Instalar dependências: `@nestjs/*`, `prisma`, `ethers`, `@upstash/redis`, `passport-jwt`, `class-validator`
- [x] **3.1.4** Configurar `ConfigModule` global com variáveis de ambiente
- [x] **3.1.5** Usar `@upstash/redis` (REST API, sem infra) no lugar de BullMQ para nonces

### 3.2 — Banco de Dados (Prisma + Supabase)
- [x] **3.2.1** Criar `prisma/schema.prisma` com modelos completos
- [x] **3.2.2** Modelos: `User`, `Product`, `Trace`, `SyncState`
- [x] **3.2.3** Preencher `DATABASE_URL` e rodar `pnpm --filter @selva/api prisma:migrate` — tabelas criadas no Supabase
- [x] **3.2.4** `PrismaService` global injetável em todos os módulos

### 3.3 — Módulo Auth
- [x] **3.3.1** `POST /api/auth/nonce` — nonce armazenado no Upstash Redis (TTL 5min)
- [x] **3.3.2** `POST /api/auth/verify` — `ethers.verifyMessage` + retorna JWT
- [x] **3.3.3** `JwtAuthGuard` via Passport
- [x] **3.3.4** `RolesGuard` com `@Roles('admin' | 'producer' | 'user')`

### 3.4 — Módulo Users
- [x] **3.4.1** `GET /api/users` — lista paginada
- [x] **3.4.2** `GET /api/users/:address` — detalhes por endereço
- [x] **3.4.3** `GET /api/users/me` — perfil autenticado

### 3.5 — Módulo Producers
- [x] **3.5.1** `GET /api/producers` — lista produtores
- [x] **3.5.2** `POST /api/producers/:address/promote` — backend chama `makeProducer` on-chain + atualiza DB

### 3.6 — Módulo Products
- [x] **3.6.1** `GET /api/products` — lista paginada com filtros (active, producer, owner)
- [x] **3.6.2** `GET /api/products/:lotId` — detalhes com traces
- [x] **3.6.3** `GET /api/products/:lotId/history` — histórico de rastreabilidade
- [x] **3.6.4** `DELETE /api/products/:lotId` — desativa lote (admin + on-chain)
- [ ] `POST /products` e `POST /products/:lotId/transfer` — usuário chama diretamente via MetaMask (frontend → blockchain)

### 3.7 — Módulo Blockchain (Indexer)
- [x] **3.7.1** `BlockchainService` com provider Alchemy + signer admin + instância do contrato
- [x] **3.7.2** `IndexerService` com cron job `@nestjs/schedule` a cada 30s:
  - `UserRegistered` → upsert `User`
  - `ProducerCreated` → update `User.isProducer`
  - `ProductAdded` → upsert `Product` + insert `Trace`
  - `OwnershipTransferred` → update `Product.currentOwnerAddress` + insert `Trace`
- [x] **3.7.3** Chunking de 2000 blocos por query (limite Alchemy free tier)
- [x] **3.7.4** `SyncState` persiste `lastBlock` no Postgres

### 3.8 — Documentação e Finalização
- [x] **3.8.1** Swagger configurado em `GET /api/docs`
- [x] **3.8.2** Validação global de DTOs com `class-validator` + `class-transformer`
- [x] **3.8.3** CORS configurado para o frontend
- [x] **3.8.4** Build TypeScript sem erros (`tsc --noEmit` limpo)
- [x] **3.8.5** Preencher `.env` e rodar migration do Prisma — Supabase DATABASE_URL configurado, migration aplicada

---

## Fase 4 — Frontend (Next.js)

### 4.1 — Setup e Configuração
- [x] **4.1.1** Instalar dependências: `wagmi`, `viem`, `@tanstack/react-query`, `framer-motion`, `lucide-react`
- [x] **4.1.2** Componentes UI customizados (inspirados em shadcn): `Button`, `Card`, `Input`, `Label`, `Badge`
- [x] **4.1.3** Configurar `wagmi` com Polygon Amoy + connectors MetaMask/injected em `lib/wagmi.ts`
- [x] **4.1.4** Configurar `WagmiProvider` + `QueryClientProvider` no `layout.tsx`
- [x] **4.1.5** Criar cliente fetch tipado para a API em `lib/api.ts` (com auto-redirect 401)
- [x] **4.1.6** ABI do contrato em `src/contracts/abi.ts` (as const para type inference wagmi)
- [x] **4.1.7** Configurar metadados e `lang="pt-BR"` no `layout.tsx`

### 4.2 — Autenticação
- [x] **4.2.1** Criar página `/auth`: conectar MetaMask → `registerUser` on-chain (se novo) → assinar nonce → JWT
- [x] **4.2.2** Criar `src/middleware.ts` para proteger rotas autenticadas (verifica cookie `selva_token`)
- [x] **4.2.3** Criar hook `useAuth()` com `connectAndSign()`, `logout()`, estado `user`/`isAuthenticated`

### 4.3 — Layout e Navegação
- [x] **4.3.1** Criar layout `(app)/layout.tsx` com auth guard + redirect para `/auth`
- [x] **4.3.2** Criar componente `Sidebar` com navegação role-based (producer/admin items)
- [x] **4.3.3** Criar componente `WalletStatus` (endereço, rede, saldo MATIC via `formatUnits`)
- [x] **4.3.4** Criar componente `NetworkGuard` — overlay bloqueante se rede errada + `useSwitchChain`

### 4.4 — Páginas

#### Landing (`/`)
- [x] **4.4.1** Página inicial com hero section + dark theme SELVA
- [x] **4.4.2** Metadados e responsividade básica

#### Dashboard (`/dashboard`)
- [x] **4.4.3** Cards de resumo: total de usuários, produtores, lotes ativos (via API)
- [x] **4.4.4** Tabela de lotes recentes com framer-motion fade-up

#### Produtos (`/products`)
- [x] **4.4.5** Tabela paginada com busca + filtros ativo/inativo
- [x] **4.4.6** Botão "Novo Lote" visível apenas para produtores e admins

#### Novo Produto (`/products/new`)
- [x] **4.4.7** Formulário: lotId, volume, origem + upload de documento (SHA-256 via `crypto.subtle`)
- [x] **4.4.8** Feedback de transação (pending → confirmada na blockchain)

#### Detalhe do Produto (`/products/[lotId]`)
- [x] **4.4.9** Informações do lote: produtor, dono atual, volume, origem, hash do documento
- [x] **4.4.10** Timeline vertical de rastreabilidade com framer-motion + links para Polygonscan
- [x] **4.4.11** Botão "Transferir" visível apenas para o dono atual do lote ativo

#### Transferência (`/products/[lotId]/transfer`)
- [x] **4.4.12** Input de endereço Ethereum com validação `isAddress` (viem)
- [x] **4.4.13** Chama `transferProduct` on-chain com feedback de tx pending/success

#### Admin — Usuários (`/admin/users`)
- [x] **4.4.14** Tabela de usuários registrados on-chain
- [x] **4.4.15** Botão "Promover a Produtor" por linha (chama `api.producers.promote`)
- [x] **4.4.16** Badge de role atual (Usuário / Produtor com ShieldCheck icon)

### 4.5 — UX e Polimento
- [x] **4.5.1** Animações framer-motion na timeline de rastreabilidade e dashboard
- [x] **4.5.2** Feedback visual de erros/sucesso inline em todos os formulários
- [x] **4.5.3** Loading skeletons (animate-pulse) nas tabelas e listas
- [x] **4.5.4** Dark theme global (`#0a0a0a`) com variáveis de cor SELVA verde lima
- [x] **4.5.5** Build de produção limpo: 10 rotas, TypeScript sem erros (`next build` OK)

---

## Fase 5 — Integração e Testes E2E

- [ ] **5.1** Testar fluxo completo: registro → promoção → cadastro de lote → transferência → consulta histórico
- [ ] **5.2** Validar sincronização do indexer: evento on-chain → DB → API → Frontend
- [ ] **5.3** Testar comportamentos de erro: rede errada, wallet desconectada, tx rejeitada
- [ ] **5.4** Auditoria de segurança básica da API (rate limiting, validação de inputs, CORS)
- [ ] **5.5** Testar performance da consulta de histórico com múltiplos eventos

---

## Fase 6 — Deploy e Produção

- [ ] **6.1** Configurar projeto Supabase em produção e rodar migrations
- [ ] **6.2** Configurar instância Redis em produção (Redis Cloud ou Railway)
- [ ] **6.3** Deploy da API em produção (Railway, Render ou EC2)
- [ ] **6.4** Deploy do Frontend na Vercel
- [ ] **6.5** Configurar variáveis de ambiente em produção (sem secrets no repo)
- [ ] **6.6** Configurar domínio e HTTPS
- [ ] **6.7** Monitoramento básico (logs, uptime)

---

## Backlog (pós-MVP)

- [ ] Upload de documentos para IPFS (hash do documento verificável on-chain)
- [ ] QR Code por lote para rastreabilidade offline
- [ ] Notificações por e-mail/WhatsApp em transferências
- [ ] Suporte a múltiplos produtos além do óleo de copaíba
- [ ] Relatórios de rastreabilidade em PDF
- [ ] Deploy do contrato na Polygon Mainnet
- [ ] Autenticação alternativa sem MetaMask (abstração de wallet)
- [ ] Dashboard analytics com gráficos de volume e movimentação

---

_Última atualização: 2026-05-21 — Fases 0–4 concluídas. Aguardando chaves de ambiente para Fase 5._
