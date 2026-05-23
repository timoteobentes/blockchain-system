# SELVA — Gestão de Tarefas do MVP

Legenda: `[ ]` pendente · `[~]` em progresso · `[x]` concluído · `[-]` bloqueado

> **Para agentes continuando este trabalho:** Leia primeiro `PROJECT.md` (visão geral), depois `apps/api/prisma/schema.prisma` (modelos de dados) e `apps/web/src/lib/api.ts` (contrato do cliente HTTP). O estado atual da autenticação está em `apps/web/src/hooks/useAuth.ts` e `apps/api/src/modules/auth/auth.service.ts`.

---

## ⚡ FILA ATUAL — Próximas tarefas a executar (por ordem de prioridade)

> Este bloco é a fonte da verdade. Sempre mova tarefas concluídas para as fases correspondentes abaixo.

### PRIORIDADE 1 — Nomes em vez de endereços de carteira

**Por quê:** Produtores rurais não entendem `0x1a2b3c...`. Toda a experiência principal deve exibir nomes de pessoas ou associações.

- [x] **P1.1** — **Schema: adicionar campos de nome em Product e Trace**
  - Arquivo: `apps/api/prisma/schema.prisma`
  - Adicionar ao model `Product`:
    ```prisma
    producerName        String   @default("")
    currentOwnerName    String   @default("")
    originType          String   @default("PESSOA") // "PESSOA" | "ASSOCIACAO" | "COMUNIDADE"
    ```
  - Adicionar ao model `Trace`:
    ```prisma
    fromName  String  @default("")
    toName    String  @default("")
    ```
  - Rodar: `pnpm --filter @selva/api prisma migrate dev --name add_names`

- [x] **P1.2** — **API: incluir nome do usuário ao indexar eventos on-chain**
  - Arquivo: `apps/api/src/modules/blockchain/indexer.service.ts`
  - Quando indexar evento `ProductAdded`, buscar `User` pelo `producerAddress` e preencher `producerName` e `currentOwnerName`
  - Quando indexar evento `OwnershipTransferred`, buscar novo dono pelo endereço e atualizar `currentOwnerName` no Product + `fromName`/`toName` na Trace

- [x] **P1.3** — **API: incluir nome ao registrar operações offline**
  - Arquivo: `apps/api/src/modules/sync/sync.service.ts`
  - Em `addProductOffline()`: buscar o `User` pelo `producerAddress` e salvar `producerName` e `currentOwnerName`
  - Em `transferOffline()`: buscar o `User` pelo `toAddress` e salvar `currentOwnerName` no Product, `fromName`/`toName` na Trace

- [x] **P1.4** — **API: retornar nomes nos endpoints de produtos e traces**
  - Arquivo: `apps/api/src/modules/products/products.service.ts`
  - Incluir `producerName`, `currentOwnerName`, `originType` nos `select` do Prisma
  - Incluir `fromName`, `toName` nos `select` das Traces

- [x] **P1.5** — **API: incluir `isAdmin` no endpoint `/api/users/me`**
  - Arquivo: `apps/api/src/modules/users/users.service.ts` e `users.controller.ts`
  - O endpoint `GET /api/users/me` atualmente não retorna `isAdmin`. O admin é determinado pelo JWT (campo `isAdmin` no payload). O controller precisa ler o campo do JWT e retorná-lo.
  - **Atenção:** `isAdmin` no banco existe mas não é usado para autenticação — o `isAdmin` real vem de `ADMIN_WALLET_ADDRESS` no `.env` (ver `auth.service.ts` linha 53). O endpoint `/me` deve retornar `isAdmin` baseado no payload do JWT, não do banco.

- [x] **P1.6** — **Frontend: exibir nomes em vez de endereços**
  - Arquivo: `apps/web/src/app/(app)/products/[lotId]/page.tsx`
  - Substituir `shortenAddress(product.producerAddress)` por `product.producerName || shortenAddress(product.producerAddress)`
  - Substituir `shortenAddress(product.currentOwnerAddress)` por `product.currentOwnerName || shortenAddress(product.currentOwnerAddress)`
  - Na timeline (`Trace`): exibir `trace.fromName` / `trace.toName`
  - Os endereços completos ficam apenas na seção "Informações Técnicas" (ver Tarefa P4)

- [x] **P1.7** — **Frontend: campo "Tipo de origem" no cadastro de produção**
  - Arquivo: `apps/web/src/app/(app)/products/new/page.tsx`
  - Adicionar campo `originType`: radio ou select com opções "Pessoa física", "Associação", "Comunidade"
  - Enviar `originType` junto com `producerAddress` na chamada offline ou como dado persistido
  - Atualizar `api.sync.addProductOffline()` em `apps/web/src/lib/api.ts` para incluir o campo

---

### PRIORIDADE 2 — Página pública de rastreabilidade (QR Code)

**Por quê:** Qualquer pessoa (comprador, fiscalizador) que scannear o QR Code deve acessar uma página pública sem precisar de conta ou MetaMask.

- [x] **P2.1** — **Middleware: liberar rota `/p/*` da autenticação**
  - Arquivo: `apps/web/src/middleware.ts`
  - Adicionar `/p` à lista de rotas públicas (ao lado de `/auth` e `/`)
  - Exemplo de matcher atual: verificar se `pathname.startsWith('/p/')` e deixar passar sem verificar cookie

- [x] **P2.2** — **API: endpoint público para dados de um lote**
  - Arquivo: `apps/api/src/modules/products/products.controller.ts`
  - Adicionar rota `GET /api/public/products/:lotId` **sem** `JwtAuthGuard`
  - Retornar: `lotId`, `producerName`, `currentOwnerName`, `originType`, `origin`, `volume`, `active`, `syncStatus`, `onChainAt`, e o array de `traces` (com `action`, `fromName`, `toName`, `blockTimestamp`, `txHash`)
  - Não retornar: `producerAddress`, `currentOwnerAddress`, `documentHash` (ficam só na área técnica)

- [x] **P2.3** — **Frontend: criar página pública `/p/[lotId]`**
  - Criar arquivo: `apps/web/src/app/p/[lotId]/page.tsx`
  - Esta página NÃO fica dentro do grupo `(app)`, portanto não tem sidebar nem autenticação
  - Layout mobile-first (a maioria acessará via celular após scannear)
  - Seções da página:
    1. **Cabeçalho**: logo SELVA + "Comprovante de Rastreabilidade"
    2. **Identificação da produção**: nome do produtor/associação, tipo de origem, espécie/produto
    3. **Dados da produção**: volume/quantidade, origem geográfica, data de registro
    4. **Histórico da cadeia**: timeline com nomes (quem cadastrou → quem recebeu → proprietário atual)
    5. **Status de verificação**: badge "Verificado na blockchain" ou "Sincronização pendente"
    6. **Informações Técnicas** (colapsável/accordion): `lotId`, `documentHash`, `txHash` de cada trace, link Polygonscan, endereço do contrato
  - Usar o endpoint `GET /api/public/products/:lotId` (sem token)
  - Adicionar metadados Open Graph para compartilhamento em WhatsApp/redes sociais

- [x] **P2.4** — **Frontend: adicionar função `getPublicBaseUrl()` em `lib/api.ts`**
  - A URL base da página pública será `https://selva.eco.br/p/:lotId` em produção e `http://localhost:3000/p/:lotId` em dev
  - Usar variável `NEXT_PUBLIC_APP_URL` para construir a URL do QR code

---

### PRIORIDADE 3 — Certificado PDF redesenhado com QR code único

**Por quê:** O certificado atual gera múltiplos QR codes (um por evento). Deve ser um único QR code apontando para a página pública `/p/[lotId]`.

- [x] **P3.1** — **Backend: refatorar `CertificateService.generate()`**
  - Arquivo: `apps/api/src/modules/certificate/certificate.service.ts`
  - **Remover** a lógica de múltiplos QR codes (`buildQrEntries`, loop com 4 códigos)
  - **Gerar um único QR code** com a URL: `${APP_URL}/p/${product.lotId}`
  - Adicionar variável `APP_URL` no ConfigService (ler `NEXT_PUBLIC_APP_URL` ou `APP_URL` do `.env`)
  - Layout do PDF redesenhado (ver especificação abaixo)

- [x] **P3.2** — **Layout do novo certificado PDF (especificação)**
  ```
  ┌─────────────────────────────────────────────┐
  │  [LOGO SELVA]   SELVA — RASTREABILIDADE     │  <- header verde #c3e438 / fundo escuro
  │                  AMAZÔNICA                   │
  ├─────────────────────────────────────────────┤
  │  COMPROVANTE DE ORIGEM                       │  <- título central
  │                                              │
  │  Produtor:  [producerName]                  │
  │  Tipo:      [Pessoa física / Associação]     │
  │  Origem:    [origin]                         │
  │  Produto:   [lotId]                          │
  │  Volume:    [volume] litros                  │
  │  Data:      [onChainAt]                      │
  │  Proprietário atual: [currentOwnerName]      │
  │                                              │
  │  HISTÓRICO DE RASTREABILIDADE:               │
  │  [lista de traces com nome + data]           │
  │  ex: "Cadastrado por João Silva — 01/05/25"  │
  │      "Recebido por Assoc. Rio Preto — ..."   │
  │                                              │
  │           [QR CODE — 180x180px]              │
  │   Escaneie para verificar a autenticidade    │
  │                                              │
  │  ─────────── Informações Técnicas ─────────  │
  │  ID do Lote:    [lotId]                      │
  │  Hash doc.:     [documentHash truncado]      │
  │  Contrato:      [contractAddress]            │
  │  Rede:          Polygon Amoy                 │
  ├─────────────────────────────────────────────┤
  │  selva.eco.br · selva.eco · +55 92 9...     │  <- rodapé
  └─────────────────────────────────────────────┘
  ```

- [x] **P3.3** — **Backend: adicionar `APP_URL` ao ConfigModule**
  - Arquivo: `apps/api/src/.env` e `apps/api/src/app.module.ts`
  - Variável: `APP_URL=http://localhost:3000` (dev) / `https://selva.vercel.app` (produção)

---

### PRIORIDADE 4 — Linguagem acessível (sem jargão técnico)

**Por quê:** O público final são produtores rurais. Termos como "blockchain", "hash", "MetaMask" devem existir apenas em áreas secundárias colapsáveis.

- [x] **P4.1** — **Frontend: varredura e substituição de termos em todas as páginas**

  Mapa de substituição obrigatório:

  | Termo técnico | Termo acessível |
  |---|---|
  | blockchain | registro digital / sistema de rastreabilidade |
  | MetaMask | carteira digital |
  | hash / SHA-256 | código de verificação do documento |
  | smart contract | sistema de registro |
  | Polygon Amoy | rede de verificação |
  | lote | produção |
  | lotId | código da produção |
  | txHash | código da transação |
  | endereço da carteira | identificador digital |
  | Registrado on-chain | Registrado com sucesso |
  | sincronização pendente | registro digital em processamento |
  | MATIC | (remover - não mostrar saldo de token ao produtor) |

  Arquivos a revisar:
  - `apps/web/src/app/(app)/products/new/page.tsx`
  - `apps/web/src/app/(app)/products/[lotId]/page.tsx`
  - `apps/web/src/app/(app)/products/[lotId]/transfer/page.tsx`
  - `apps/web/src/app/(app)/products/page.tsx`
  - `apps/web/src/app/(app)/dashboard/page.tsx`
  - `apps/web/src/app/auth/page.tsx`
  - `apps/web/src/components/WalletStatus.tsx` (remover saldo MATIC da view principal)
  - `apps/web/src/components/SyncBanner.tsx`

- [x] **P4.2** — **Frontend: seção "Informações Técnicas" colapsável na página de detalhe**
  - Arquivo: `apps/web/src/app/(app)/products/[lotId]/page.tsx`
  - Criar um accordion/details-summary no final da página com:
    - Endereço do produtor (wallet)
    - Endereço do proprietário atual (wallet)
    - Hash do documento (SHA-256 completo)
    - txHash de cada evento de trace com link Polygonscan
    - Endereço do contrato inteligente
    - Rede: Polygon Amoy (chainId 80002)
  - Esta seção fica fechada por padrão com texto "Ver informações técnicas ▼"

- [x] **P4.3** — **Frontend: idem na página pública `/p/[lotId]`** (incluído em P2.3)

- [x] **P4.4** — **Frontend: remover saldo MATIC do WalletStatus visível ao produtor**
  - Arquivo: `apps/web/src/components/WalletStatus.tsx`
  - Remover o `{balance && <span>... MATIC</span>}` da view principal
  - Manter somente o indicador de conexão (ponto verde) e o endereço encurtado
  - MATIC pode ser mostrado apenas na seção técnica do perfil (a implementar)

---

### PRIORIDADE 5 — Deploy em produção (Oracle + Vercel)

- [x] **P5.1** — **API: dockerizar para deploy na Oracle Cloud**
  - Criar `apps/api/Dockerfile`:
    ```dockerfile
    FROM node:20-alpine
    WORKDIR /app
    COPY package*.json pnpm-lock.yaml ./
    RUN npm install -g pnpm && pnpm install --frozen-lockfile
    COPY . .
    RUN pnpm --filter @selva/api build
    EXPOSE 3001
    CMD ["node", "apps/api/dist/main.js"]
    ```
  - Criar `docker-compose.yml` na raiz para desenvolvimento local
  - Testar: `docker build -f apps/api/Dockerfile -t selva-api .`

- [x] **P5.2** — **API: variáveis de ambiente para produção**
  - Criar `apps/api/.env.production.example`:
    ```
    DATABASE_URL=postgresql://...supabase.com/postgres
    DIRECT_URL=postgresql://...supabase.com/postgres
    UPSTASH_REDIS_REST_URL=https://....upstash.io
    UPSTASH_REDIS_REST_TOKEN=...
    JWT_SECRET=<string aleatória 64+ chars>
    ADMIN_WALLET_ADDRESS=0x...
    CONTRACT_ADDRESS=0x...
    BLOCKCHAIN_ENABLED=true
    ALCHEMY_API_KEY=...
    APP_URL=https://selva.vercel.app
    PORT=3001
    ```
  - Documentar onde obter cada valor no README

- [x] **P5.3** — **API: configurar CORS para domínio de produção**
  - Arquivo: `apps/api/src/main.ts`
  - Ler `CORS_ORIGIN` do env e aplicar: `app.enableCors({ origin: corsOrigin })`
  - Em dev: `http://localhost:3000`; em produção: `https://selva.vercel.app`

- [x] **P5.4** — **Frontend: variáveis de ambiente para produção na Vercel**
  - Arquivo: `apps/web/.env.production.example`:
    ```
    NEXT_PUBLIC_API_URL=https://API_IP_ORACLE:3001
    NEXT_PUBLIC_APP_URL=https://selva.vercel.app
    NEXT_PUBLIC_ALCHEMY_API_KEY=...
    NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
    ```
  - No painel da Vercel: Settings → Environment Variables → adicionar todas

- [x] **P5.5** — **Frontend: configurar `vercel.json` para monorepo**
  - Criar `apps/web/vercel.json`:
    ```json
    {
      "buildCommand": "pnpm --filter @selva/web build",
      "outputDirectory": "apps/web/.next",
      "framework": "nextjs"
    }
    ```
  - No painel Vercel: Root Directory = `apps/web`

- [ ] **P5.6** — **Oracle Cloud: configurar instância e PM2**
  - Criar instância ARM gratuita (4 OCPUs, 24GB RAM) no Oracle Cloud
  - Instalar Node.js 20, pnpm, PM2
  - Configurar PM2: `pm2 start apps/api/dist/main.js --name selva-api`
  - Configurar Nginx como reverse proxy na porta 3001
  - Abrir porta no Security List da Oracle

- [ ] **P5.7** — **Smoke test pós-deploy**
  - `GET https://api.selva.eco.br/api/sync/status` → deve retornar JSON
  - Login com MetaMask no frontend Vercel → deve redirecionar para dashboard
  - Cadastrar uma produção → deve aparecer na lista

---

### PRIORIDADE 6 — Suporte a usuários sem MetaMask

**Por quê:** Produtores rurais muitas vezes não têm MetaMask instalado. Precisamos de um fluxo alternativo que crie uma wallet "por baixo dos panos".

- [ ] **P6.1** — **Pesquisa e decisão de solução** (não código ainda)
  - Avaliar: **Privy** (`@privy-io/react-auth`) — suporte a social login + embedded wallets
  - Avaliar: **Web3Auth** — similar ao Privy
  - Avaliar: **Thirdweb** (`@thirdweb-dev/react`) — in-app wallets
  - Decisão: Privy é o mais adequado para o caso de uso (login por e-mail/WhatsApp + wallet embedded)
  - Documentar a decisão em `PROJECT.md`

- [ ] **P6.2** — **Frontend: integrar Privy como provider alternativo**
  - Instalar: `pnpm --filter @selva/web add @privy-io/react-auth`
  - Criar conta em `privy.io` e obter `APP_ID`
  - Configurar `PrivyProvider` em `apps/web/src/components/Providers.tsx` ao lado do `WagmiProvider`
  - Configurar login methods: email, WhatsApp (SMS), Google
  - **Importante:** Privy cria uma wallet embedded automaticamente — o usuário não precisa instalar nada

- [ ] **P6.3** — **Frontend: atualizar página `/auth` para oferecer duas opções**
  - Arquivo: `apps/web/src/app/auth/page.tsx`
  - Opção A: "Tenho uma carteira digital (MetaMask)" → fluxo atual
  - Opção B: "Entrar com e-mail ou WhatsApp" → fluxo Privy
  - Usar o hook `usePrivy()` para o fluxo alternativo

- [ ] **P6.4** — **Backend: aceitar endereço gerado pelo Privy no fluxo de auth**
  - O Privy gera uma wallet real para o usuário — o endereço é usado da mesma forma
  - Verificar se o fluxo `POST /api/auth/nonce` + `POST /api/auth/verify` funciona com wallets Privy
  - Privy pode assinar mensagens com a wallet embedded — deve ser compatível com `ethers.verifyMessage`

---

### PRIORIDADE 7 — Coleta gradual de dados do produtor

**Por quê:** Precisamos de título de propriedade e certificado de produtor rural, mas formulários longos afastam o usuário. A coleta deve ser progressiva.

- [ ] **P7.1** — **Schema: adicionar campos de documentação ao modelo User**
  - Arquivo: `apps/api/prisma/schema.prisma`
  - Adicionar ao model `User`:
    ```prisma
    // Dados pessoais
    phone          String?
    associationName String?
    communityName  String?

    // Documentação gradual
    propertyTitle      String?  // URL ou hash do documento
    ruralProducerCert  String?  // DAP/CAF — Declaração de Aptidão ao Pronaf ou Cadastro na Agricultura Familiar
    profileStep        Int      @default(1)  // 1=básico, 2=dados_produtor, 3=documentos
    profileCompleted   Boolean  @default(false)
    ```
  - Rodar migration: `pnpm --filter @selva/api prisma migrate dev --name add_producer_profile`

- [ ] **P7.2** — **API: endpoint para atualizar perfil em etapas**
  - Arquivo: `apps/api/src/modules/users/users.controller.ts`
  - `PATCH /api/users/me/profile` — atualiza campos do produtor (autenticado)
  - Aceitar: `phone`, `associationName`, `communityName`, `propertyTitle`, `ruralProducerCert`, `profileStep`
  - Validar com `class-validator` — todos os campos opcionais

- [ ] **P7.3** — **Frontend: banner de "complete seu perfil"**
  - Arquivo: `apps/web/src/components/ProfileBanner.tsx` (criar)
  - Mostrar no dashboard para produtores com `profileCompleted = false`
  - Ações progressivas:
    - Passo 1 (após cadastro): confirmar nome e telefone
    - Passo 2: informar associação ou comunidade (opcional)
    - Passo 3: enviar DAP/CAF ou título de propriedade (foto ou PDF)
  - Cada passo completado muda `profileStep` e eventualmente `profileCompleted = true`

- [ ] **P7.4** — **Frontend: tela de perfil do produtor**
  - Arquivo: `apps/web/src/app/(app)/profile/page.tsx` (criar)
  - Adicionar link no sidebar: "Meu Perfil" (ícone User)
  - Exibir informações atuais + formulário de edição por seção
  - Upload de documentos: usar serviço de storage (Supabase Storage ou S3)

---

## Fases anteriores (concluídas)

### Fase 0 — Fundação
- [x] Definir stack tecnológica
- [x] Escrever contrato inteligente `SELVATraceability.sol`
- [x] Criar `PROJECT.md`
- [x] Criar `TASKS.md`

### Fase 1 — Infraestrutura do Monorepo
- [x] **1.1–1.11** Monorepo pnpm + Turborepo configurado, `packages/types`, `packages/shared`, workspaces funcionando

### Fase 2 — Blockchain / Smart Contract
- [x] **2.1–2.7** Contrato em `blockchain/contracts/SELVATraceability.sol`, 36/36 testes passando, script de deploy pronto
- [ ] **2.8–2.10** Deploy na Polygon Amoy (bloqueado — aguardando MATIC no faucet)
- [x] **2.11** ABI exportada para `packages/types`
- [ ] **2.12** Registrar `CONTRACT_ADDRESS` no `.env` após deploy

### Fase 3 — Backend / API (NestJS)
- [x] **3.1–3.8** Setup completo: Auth (nonce/verify/JWT), Users, Producers, Products, Blockchain Indexer, Sync offline, Swagger, CORS, Prisma + Supabase
- [x] **3.x** Modo offline implementado: `PendingOperation` + `SyncService` para operar sem blockchain

### Fase 4 — Frontend (Next.js)
- [x] **4.1–4.5** Setup wagmi, autenticação MetaMask, middleware de rotas, sidebar com antd Sider, todas as páginas (dashboard, lotes, novo lote, detalhe, transferência, admin usuários)
- [x] **4.x** Offline mode com `api.sync.status()` + fallback para `addProductOffline`/`transferOffline`
- [x] **4.x** CPF mask, loading states, cookie + localStorage para token JWT
- [x] **4.x** Correção crítica: `isAdmin: false` hardcoded → `isAdmin: u.isAdmin` no `useAuth.ts`

### Fase 5 — Integração e Deploy
- [ ] **5.1–5.7** Ver seção PRIORIDADE 5 acima

---

## Decisões de arquitetura já tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Banco | Supabase (PostgreSQL managed) | Sem infra, free tier, row-level security |
| Cache/nonce | Upstash Redis (REST) | Serverless, sem infra, TTL nativo |
| Auth | MetaMask + nonce/sign/JWT | Sem senha, ownership-based |
| Blockchain | Polygon Amoy testnet | Baixo custo, compatível EVM |
| Modo offline | BLOCKCHAIN_ENABLED=false → DB local + sync posterior | Para demos sem MATIC |
| Deploy API | Oracle Cloud Free Tier ARM VM | 4 OCPUs / 24GB RAM grátis |
| Deploy Web | Vercel | First-class Next.js, CI/CD automático |
| Wallet alternativa | Privy (a implementar) | Embedded wallets para usuários sem MetaMask |

---

## Estado atual do `.env` (o que já deve estar preenchido)

Antes de continuar qualquer tarefa, verificar que o arquivo `apps/api/.env` contém:
- `DATABASE_URL` — PostgreSQL Supabase (pooler)
- `DIRECT_URL` — PostgreSQL Supabase (direct)
- `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`
- `JWT_SECRET`
- `ADMIN_WALLET_ADDRESS` — endereço que terá role de admin (login → `isAdmin: true`)
- `ALCHEMY_API_KEY`
- `BLOCKCHAIN_ENABLED` — `false` para modo offline, `true` quando blockchain disponível
- `CONTRACT_ADDRESS` — vazio até o deploy do contrato

---

_Última atualização: 2026-05-22 — Prioridades P1–P5 concluídas. Pendentes: P5.6–P5.7 (deploy Oracle/smoke test), P6 (Privy / sem MetaMask), P7 (coleta gradual de dados do produtor). Próximo passo recomendado: P6.1 (avaliar Privy) ou P5.6 (deploy Oracle Cloud)._
