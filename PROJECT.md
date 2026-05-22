# SELVA — Sistema Estruturado Legal de Valores Amazônicos

## Visão Geral

O SELVA é uma plataforma de **rastreabilidade da cadeia produtiva amazônica** baseada em blockchain. O MVP foca no óleo-resina de copaíba como produto piloto, garantindo transparência e segurança em cada etapa da cadeia — do produtor extrativista ao consumidor final.

A solução combina um contrato inteligente imutável (fonte de verdade) com uma API centralizada (regras de negócio, indexação e cache) e uma interface web moderna para facilitar a adoção por comunidades com baixo letramento digital.

---

## Stack Tecnológica

| Camada          | Tecnologias                                                                 |
|-----------------|-----------------------------------------------------------------------------|
| Frontend        | Next.js 15, TypeScript, TailwindCSS v4, shadcn/ui, wagmi, viem, ethers.js, framer-motion, lucide-icons |
| Backend/API     | NestJS, TypeScript, Prisma ORM, JWT, ethers.js, BullMQ, Redis, Swagger     |
| Banco de Dados  | PostgreSQL via Supabase                                                     |
| Blockchain      | Polygon Amoy Testnet                                                        |
| Smart Contract  | Solidity ^0.8.17, Hardhat                                                   |
| Wallet          | MetaMask                                                                    |
| RPC             | Alchemy                                                                     |
| Infraestrutura  | pnpm workspaces, Turborepo, Upstash (Redis serverless)                      |

---

## Estrutura do Projeto (Monorepo)

```
blockchain-system/
├── apps/
│   ├── web/                    # Frontend Next.js
│   │   ├── src/
│   │   │   ├── app/            # App Router (páginas)
│   │   │   ├── components/     # Componentes React
│   │   │   ├── hooks/          # Custom hooks (wagmi, contrato)
│   │   │   ├── lib/            # Clientes (wagmi config, axios)
│   │   │   └── styles/
│   │   ├── public/
│   │   └── package.json
│   │
│   └── api/                    # Backend NestJS
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/       # JWT + assinatura MetaMask
│       │   │   ├── users/      # Gestão de usuários
│       │   │   ├── producers/  # Gestão de produtores
│       │   │   ├── products/   # Gestão de lotes/produtos
│       │   │   └── blockchain/ # Listener de eventos on-chain
│       │   ├── prisma/
│       │   └── main.ts
│       └── package.json
│
├── blockchain/
│   ├── contracts/
│   │   └── SELVATraceability.sol
│   ├── scripts/
│   │   └── deploy.ts
│   ├── test/
│   │   └── SELVATraceability.test.ts
│   ├── hardhat.config.ts
│   └── package.json            # @selva/api
│
├── packages/
│   ├── types/                  # @selva/types — tipos TS compartilhados (DTOs, ABI)
│   ├── shared/                 # @selva/shared — utilitários e constantes
│   └── config/                 # @selva/config — TSConfig base
│
├── turbo.json
├── pnpm-workspace.yaml
├── .env.example
├── PROJECT.md
└── TASKS.md
```

---

## Smart Contract — `SELVATraceability.sol`

**Rede:** Polygon Amoy Testnet  
**Compilador:** Solidity ^0.8.17

### Roles / Permissões

| Role            | Quem é          | Capacidades                                      |
|-----------------|-----------------|--------------------------------------------------|
| `owner`         | Deployer/Admin  | `makeProducer`, `deactivateProduct`              |
| `isProducer`    | Produtor        | `addProduct`                                     |
| Usuário comum   | Qualquer wallet | `registerUser`, `transferProduct` (se dono do lote) |

### Structs

**User**
```
name       string   — nome completo
cpf        string   — CPF do usuário
account    address  — carteira Ethereum vinculada
createdAt  uint256  — timestamp de registro
```

**Product (Lote)**
```
lotId         string   — identificador único (ex: "ABC123")
volume        uint256  — volume em litros (unidades base)
origin        string   — espécie + localização de extração
producer      address  — extrator original (imutável)
currentOwner  address  — proprietário atual
documentHash  bytes32  — hash SHA-256 do documento/licença
createdAt     uint256  — timestamp de registro
active        bool     — status ativo/inativo
```

**Trace (Histórico)**
```
actor      address  — quem executou a ação
action     string   — "CREATED" | "TRANSFERRED" | "DEACTIVATED"
docHash    bytes32  — hash do documento associado à ação
from       address  — proprietário anterior
to         address  — novo proprietário
timestamp  uint256  — timestamp do bloco
```

### Funções

| Função                              | Acesso          | Descrição                                              |
|-------------------------------------|-----------------|--------------------------------------------------------|
| `registerUser(name, cpf)`           | Qualquer wallet | Registra usuário, retorna `userHash` (bytes32)         |
| `makeProducer(userAddress)`         | Owner           | Promove usuário registrado a produtor                  |
| `addProduct(lotId, volume, origin, docHash)` | Produtor | Registra novo lote; cria entrada "CREATED" no histórico |
| `transferProduct(lotId, newOwner)`  | Dono do lote    | Transfere propriedade; cria entrada "TRANSFERRED"      |
| `deactivateProduct(lotId)`          | Owner           | Desativa lote logicamente; cria entrada "DEACTIVATED"  |
| `getProduct(lotId)`                 | Público         | Retorna todos os campos de um lote                     |
| `getProductHistory(lotId)`          | Público         | Retorna arrays paralelos com histórico completo         |
| `listAllLotIds()`                   | Público         | Lista todos os lotIds registrados                      |
| `listAllUsers()`                    | Público         | Lista todos os userHashes registrados                  |
| `getUser(userHash)`                 | Público         | Retorna dados de um usuário pelo hash                  |
| `userHashOf(address)`               | Público         | Retorna userHash de um endereço (0 se não registrado)  |
| `isUserRegistered(address)`         | Público         | Verifica se endereço está registrado                   |
| `isProducer(address)`               | Público         | Verifica se endereço tem role de produtor              |

### Eventos

```solidity
UserRegistered(bytes32 indexed userHash, address userAddress)
ProducerCreated(address indexed producerAddress)
ProductAdded(string indexed lotId, address indexed producer, bytes32 documentHash)
OwnershipTransferred(string indexed lotId, address indexed from, address indexed to)
```

---

## Fluxo Principal do MVP

```
1. Usuário conecta MetaMask (Polygon Amoy)
2. Usuário chama registerUser(name, cpf) → recebe userHash
3. Admin chama makeProducer(address) para promover usuário a produtor
4. Produtor chama addProduct(lotId, volume, origin, docHash) → lote registrado on-chain
5. Produtor ou dono atual chama transferProduct(lotId, newOwner) → cadeia de custódia
6. Qualquer pessoa consulta getProduct / getProductHistory → rastreabilidade pública
```

---

## Banco de Dados (Prisma + Supabase PostgreSQL)

O banco espelha o estado on-chain para consultas rápidas (sem depender de RPC a cada request):

- **users** — espelho de User on-chain + dados adicionais (email, role local)
- **producers** — relação com users + metadados
- **products** — espelho de Product + status sincronizado
- **traces** — histórico de eventos indexados
- **sync_blocks** — controle do último bloco processado pelo listener

---

## Variáveis de Ambiente

### `apps/api/.env`
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
UPSTASH_REDIS_REST_URL=     # console.upstash.com
UPSTASH_REDIS_REST_TOKEN=
JWT_SECRET=
JWT_EXPIRES_IN=7d
ALCHEMY_API_KEY=
CONTRACT_ADDRESS=
ADMIN_PRIVATE_KEY=          # chave do owner do contrato (backend admin)
POLYGON_AMOY_RPC=https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}
PORT=3001
```

### `apps/web/.env.local`
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_ALCHEMY_API_KEY=
NEXT_PUBLIC_CHAIN_ID=80002   # Polygon Amoy
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### `blockchain/.env`
```env
ALCHEMY_API_KEY=
DEPLOYER_PRIVATE_KEY=
POLYGONSCAN_API_KEY=         # para verificação do contrato
```

---

## Páginas do Frontend (MVP)

| Rota                        | Acesso      | Descrição                                           |
|-----------------------------|-------------|-----------------------------------------------------|
| `/`                         | Público     | Landing page com CTA                                |
| `/auth`                     | Público     | Conectar MetaMask + registrar usuário               |
| `/dashboard`                | Autenticado | Visão geral: lotes ativos, produções recentes       |
| `/products`                 | Autenticado | Lista de lotes registrados                          |
| `/products/new`             | Produtor    | Formulário para registrar novo lote                 |
| `/products/[lotId]`         | Público     | Detalhe do lote + histórico de rastreabilidade      |
| `/products/[lotId]/transfer`| Dono do lote| Formulário para transferir custódia                 |
| `/admin/users`              | Owner/Admin | Lista e promoção de usuários a produtores           |

---

## Contratos e Configurações de Rede

| Parâmetro        | Valor                                                      |
|------------------|------------------------------------------------------------|
| Rede             | Polygon Amoy Testnet                                       |
| Chain ID         | 80002                                                      |
| RPC (Alchemy)    | `https://polygon-amoy.g.alchemy.com/v2/{API_KEY}`          |
| Block Explorer   | https://amoy.polygonscan.com                               |
| Faucet MATIC     | https://faucet.polygon.technology                          |

---

## Comandos Principais

```bash
# Instalar dependências (monorepo)
pnpm install

# Desenvolvimento local
pnpm dev                           # roda web + api em paralelo (turbo)
pnpm --filter @selva/web dev       # só o frontend
pnpm --filter @selva/api dev       # só o backend

# Blockchain
pnpm --filter @selva/blockchain compile    # compila contratos
pnpm --filter @selva/blockchain test       # testa contratos
pnpm --filter @selva/blockchain deploy     # deploy na Amoy

# Banco de dados
pnpm --filter @selva/api prisma migrate dev
pnpm --filter @selva/api prisma studio
```

---

## Autores

- **SELVA** — rafael@selva.eco.br
- Desenvolvido com foco em comunidades amazônicas produtoras de ativos florestais
