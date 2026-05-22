# SELVA — Como Testar Localmente

Guia passo a passo para subir a aplicação, abrir no navegador e testar o fluxo completo.

---

## Pré-requisitos

Verifique antes de começar:

- [ ] **Node.js 20+** instalado → `node -v`
- [ ] **pnpm 9+** instalado → `pnpm -v` (instalar: `npm install -g pnpm`)
- [ ] **MetaMask** instalado no browser (Chrome/Brave/Edge)
- [ ] Dependências instaladas → se não rodou ainda: `pnpm install` na raiz

---

## Parte 1 — Corrigir o `.env` da API (2 ajustes necessários)

Abra o arquivo `apps/api/.env` e faça as duas correções abaixo:

### 1.1 — Completar a URL do RPC Alchemy

Localize esta linha:
```
POLYGON_AMOY_RPC=https://polygon-amoy.g.alchemy.com/v2/
```
Adicione a chave da Alchemy no final (a mesma que está em `ALCHEMY_API_KEY`):
```
POLYGON_AMOY_RPC=https://polygon-amoy.g.alchemy.com/v2/CdERyb35fgC_NWq6pD34I
```

### 1.2 — Ativar o modo offline (sem MATIC disponível)

Adicione esta linha no final do arquivo:
```
BLOCKCHAIN_ENABLED=false
```

> **O que isso faz:** a API opera somente com o banco de dados Supabase. Registros, produtos e transferências são salvos localmente com status "PENDENTE". Quando o contrato for deployado e houver MATIC, mude para `BLOCKCHAIN_ENABLED=true` e tudo sincronizará com a blockchain.

O arquivo deve terminar assim:
```
ADMIN_WALLET_ADDRESS=0x7E043Fe7f5D2BF1aE0c9A1FD3287751f6E584d30

FRONTEND_URL=http://localhost:3000
PORT=3001

BLOCKCHAIN_ENABLED=false
```

---

## Parte 2 — Configurar a MetaMask

### 2.1 — Adicionar a rede Polygon Amoy

1. Abra a MetaMask → clique no seletor de rede (topo) → **"Adicionar rede"**
2. Clique em **"Adicionar rede manualmente"**
3. Preencha:

| Campo | Valor |
|---|---|
| Nome da rede | `Polygon Amoy Testnet` |
| URL do RPC | `https://polygon-amoy.g.alchemy.com/v2/CdERyb35fgC_NWq6pD34I` |
| ID da rede (Chain ID) | `80002` |
| Símbolo da moeda | `MATIC` |
| URL do explorador | `https://amoy.polygonscan.com` |

4. Clique em **Salvar**
5. Selecione **Polygon Amoy Testnet** como rede ativa

### 2.2 — Ter ao menos uma conta na MetaMask

- Use qualquer conta existente ou crie uma nova
- No modo offline, **não precisa de MATIC** — nenhuma transação real será enviada
- Anote o endereço `0x...` da sua conta (você vai precisar para se promover a produtor)

---

## Parte 3 — Subir os servidores

Abra **dois terminais separados** na raiz do projeto:

### Terminal 1 — API (NestJS)

```bash
pnpm --filter @selva/api dev
```

Aguarde aparecer:
```
[Nest] LOG  Application is running on: http://[::1]:3001
```

> **Swagger (documentação da API):** http://localhost:3001/api/docs

### Terminal 2 — Frontend (Next.js)

```bash
pnpm --filter @selva/web dev
```

Aguarde aparecer:
```
▲ Next.js 15.x.x
✓ Ready on http://localhost:3000
```

---

## Parte 4 — Testar no navegador

Abra: **http://localhost:3000**

---

### Passo 4.1 — Autenticação

1. Você verá a landing page do SELVA
2. Clique no botão **"Acessar Plataforma"** (ou navegue para `/auth`)
3. Clique em **"Conectar MetaMask"** → aprove a conexão na extensão
4. Clique em **"Autenticar"** → assine a mensagem que a MetaMask exibir
   - Esta assinatura **não gera transação** nem consome MATIC
5. Você será redirecionado ao **Dashboard**

> No canto superior direito aparecerá seu endereço conectado e um banner amarelo indicando o modo offline.

---

### Passo 4.2 — Registrar-se como usuário

> No modo offline, este passo registra você no banco de dados local.

1. Vá para **`/auth`** → seção de registro
2. Preencha **nome** e **CPF**
3. Clique em **"Registrar"**
4. Um `PendingOperation` do tipo `REGISTER_USER` será criado no banco

---

### Passo 4.3 — Promover a Produtor (como Admin)

O endereço admin está definido em `ADMIN_WALLET_ADDRESS` no `.env`. Se você estiver logado com essa wallet, terá acesso ao painel admin.

1. Vá para **`/admin/users`**
2. Localize seu endereço na tabela
3. Clique em **"Promover"** na linha correspondente
4. O status mudará para **Produtor** (com badge amarelo "Pendente blockchain")

> Se sua wallet **não for** a admin, conecte a wallet que está em `ADMIN_WALLET_ADDRESS` e repita.

---

### Passo 4.4 — Registrar um Lote (Produto)

1. Vá para **`/products`** → clique em **"Novo Lote"**
2. Preencha:
   - **ID do Lote:** `COPA-DEMO-001`
   - **Volume:** `500`
   - **Origem:** `Copaifera langsdorffii — Manaus/AM`
   - **Documento:** faça upload de qualquer arquivo PDF (o hash SHA-256 é calculado no browser)
3. Clique em **"Registrar na blockchain"**
   - No modo offline: salva no banco sem transação MetaMask
4. O lote aparecerá na lista de produtos com badge **"Pendente blockchain"**

---

### Passo 4.5 — Ver o Lote e Baixar o Certificado

1. Na lista de produtos, clique na seta → direito do lote `COPA-DEMO-001`
2. Você verá:
   - Informações do lote (volume, origem, produtor, proprietário atual)
   - Timeline de rastreabilidade com o evento **"Registrado"**
   - Badge amarelo **"Pendente blockchain"**
3. Clique em **"Certificado"** → o PDF será baixado automaticamente

> O PDF terá marca d'água **"PENDENTE"** e QR codes apontando para `selva.eco.br` (pois ainda não há txHash da blockchain). Quando sincronizado, o certificado final terá os QR codes do Polygonscan.

---

### Passo 4.6 — Transferir Custódia do Lote

1. Na página do lote, clique em **"Transferir"**
2. Insira o endereço `0x...` do destinatário
3. Clique em **"Transferir propriedade"**
   - No modo offline: registra a transferência no banco
4. A timeline do lote agora mostrará dois eventos: **Registrado** + **Transferido**
5. Baixe o certificado novamente — haverá um novo QR para a transferência

---

### Passo 4.7 — Verificar o Banner de Sincronização

No canto superior do layout aparecerá o banner:

> **"X operação(ões) pendente(s) de sincronização com a blockchain"**

Quando houver MATIC e o contrato estiver deployado:
1. Mude `BLOCKCHAIN_ENABLED=true` no `.env` e reinicie a API
2. Preencha `CONTRACT_ADDRESS` no `.env` da API e no `apps/web/.env.local`
3. Clique em **"Sincronizar"** no banner
4. A MetaMask abrirá para cada operação pendente — assine uma a uma
5. Após confirmar todas, as badges "Pendente" desaparecem e os certificados são emitidos com hashes reais

---

## Parte 5 — Ativar o Modo Blockchain (quando tiver MATIC)

### 5.1 — Fazer o deploy do contrato

```bash
# Certifique-se que blockchain/.env tem ALCHEMY_API_KEY e DEPLOYER_PRIVATE_KEY preenchidos
pnpm --filter @selva/blockchain run deploy
```

O terminal mostrará:
```
SELVATraceability deployed to: 0xABCD...1234
```

### 5.2 — Atualizar o endereço do contrato

Em `apps/api/.env`:
```
CONTRACT_ADDRESS=0xABCD...1234
BLOCKCHAIN_ENABLED=true
```

Em `apps/web/.env.local`:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xABCD...1234
```

### 5.3 — Reiniciar os servidores

Pare os dois terminais (`Ctrl+C`) e rode novamente:
```bash
pnpm --filter @selva/api dev
pnpm --filter @selva/web dev
```

---

## Referência Rápida

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| Swagger (docs da API) | http://localhost:3001/api/docs |
| Supabase (banco) | https://supabase.com/dashboard |
| Polygonscan Amoy | https://amoy.polygonscan.com |

| Modo | `BLOCKCHAIN_ENABLED` | Precisa de MATIC? | MetaMask assina? |
|---|---|---|---|
| Offline (atual) | `false` | Não | Só na autenticação |
| Online | `true` | Sim | Em cada transação |

---

## Problemas Comuns

**API não sobe / erro de banco**
→ Verifique se `DATABASE_URL` está correto no `apps/api/.env`
→ Verifique conectividade com a internet (Supabase é cloud)

**MetaMask não aparece**
→ Verifique se a extensão está instalada e desbloqueada
→ Tente em modo incógnito com a extensão permitida

**"Rede incorreta" (NetworkGuard)**
→ Clique em "Trocar para Polygon Amoy" no overlay que aparece
→ Ou troque manualmente na MetaMask para a rede Polygon Amoy Testnet

**Erro 401 na API**
→ Faça logout e autentique novamente em `/auth`

**Banner de sync não desaparece após sincronizar**
→ Recarregue a página (`F5`) — o banner atualiza no carregamento
