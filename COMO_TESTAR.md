# SELVA — Guia de Deploy em Produção

> Cenário: conta **Vercel gratuita** (sem suporte a Turborepo remoto) + **Oracle Cloud Free Tier** (VM ARM).
> Cada app é implantado de forma independente — sem precisar do monorepo completo no servidor.

---

## Visão geral da arquitetura

```
Internet
   │
   ├── selva.vercel.app  →  apps/web  (Next.js, Vercel)
   │
   └── api.selva.eco.br  →  apps/api  (NestJS, Oracle Cloud VM)
                               │
                               ├── Supabase (PostgreSQL)
                               └── Upstash (Redis)
```

---

## Parte 1 — Backend na Oracle Cloud (apps/api)

### 1.1 Criar a instância gratuita

1. Acesse [cloud.oracle.com](https://cloud.oracle.com) → **Compute → Instances → Create Instance**
2. Configurações:
   - **Shape:** `VM.Standard.A1.Flex` (ARM) — **4 OCPUs, 24 GB RAM** (gratuito)
   - **OS:** Ubuntu 22.04
   - **Storage:** 50 GB (gratuito)
   - **SSH key:** gere ou importe sua chave pública
3. Anote o **IP público** da instância após criação

### 1.2 Abrir portas na Oracle

Na instância → **Security Lists → Default Security List → Add Ingress Rules**:

| Protocolo | Porta | Origem     |
|-----------|-------|------------|
| TCP       | 22    | 0.0.0.0/0  |
| TCP       | 80    | 0.0.0.0/0  |
| TCP       | 443   | 0.0.0.0/0  |
| TCP       | 3001  | 0.0.0.0/0  |

### 1.3 Configurar o servidor

Conecte via SSH e execute:

```bash
ssh ubuntu@<IP_ORACLE>

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar pnpm, PM2 e Nginx
npm install -g pnpm pm2
sudo apt install -y nginx iptables-persistent

# Liberar portas no firewall interno do Ubuntu
sudo iptables -I INPUT -p tcp --dport 3001 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo netfilter-persistent save
```

### 1.4 Clonar e configurar a API

```bash
git clone https://github.com/<seu-usuario>/blockchain-system.git
cd blockchain-system

# Instalar dependências apenas do apps/api (inclui dependências transitivas)
pnpm install --filter @selva/api...

# Copiar e preencher o .env
cp apps/api/.env.production.example apps/api/.env
nano apps/api/.env
```

Preencha `apps/api/.env` com os valores reais:

```env
DATABASE_URL=postgresql://postgres.[ref]:[senha]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[senha]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
UPSTASH_REDIS_REST_URL=https://[...].upstash.io
UPSTASH_REDIS_REST_TOKEN=[token]
JWT_SECRET=[string-aleatoria-minimo-64-caracteres]
ADMIN_WALLET_ADDRESS=0x[sua-carteira-admin]
CONTRACT_ADDRESS=0x[endereco-do-contrato-ou-vazio]
BLOCKCHAIN_ENABLED=false
ALCHEMY_API_KEY=[sua-chave-alchemy]
APP_URL=https://[seu-projeto].vercel.app
FRONTEND_URL=https://[seu-projeto].vercel.app
PORT=3001
```

### 1.5 Migrations e build

```bash
cd apps/api

# Aplicar migrations no banco de produção
# (NUNCA use migrate dev em produção — use migrate deploy)
npx prisma migrate deploy
npx prisma generate

# Build da API
npm run build

cd ../..
```

### 1.6 Iniciar com PM2

```bash
pm2 start apps/api/dist/main.js --name selva-api

# Salvar configuração para sobreviver a reboots
pm2 save
pm2 startup
# → Execute o comando sudo que o PM2 sugerir

# Verificar
pm2 status
pm2 logs selva-api
```

### 1.7 Configurar Nginx como proxy reverso

```bash
sudo nano /etc/nginx/sites-available/selva-api
```

Cole o conteúdo:

```nginx
server {
    listen 80;
    server_name <IP_ORACLE>;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/selva-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 1.8 Verificar

```bash
# No próprio servidor
curl http://localhost:3001/api/sync/status

# De fora (no seu computador)
curl http://<IP_ORACLE>/api/sync/status
# Esperado: {"blockchainEnabled":false,"pendingOperations":0}
```

### 1.9 Atualizar a API após mudanças no código

```bash
cd ~/blockchain-system
git pull
pnpm install --filter @selva/api...
cd apps/api
npx prisma migrate deploy
npm run build
cd ../..
pm2 restart selva-api
```

---

## Parte 2 — Frontend na Vercel (apps/web)

> Na conta gratuita da Vercel não é possível usar Turborepo remoto.
> A solução é apontar o Vercel diretamente para `apps/web`, que **não depende**
> de nenhum pacote local do monorepo — funciona como uma app Next.js standalone.

### 2.1 Importar o projeto na Vercel

1. Acesse [vercel.com](https://vercel.com) → **Add New → Project**
2. Conecte o repositório GitHub
3. Na tela de configuração, preencha:

| Campo | Valor |
|---|---|
| **Framework Preset** | Next.js |
| **Root Directory** | `apps/web` ← **obrigatório** |
| **Build Command** | `next build` (deixar auto) |
| **Output Directory** | `.next` (deixar auto) |
| **Install Command** | `npm install` |

> **Por que `Root Directory = apps/web`?**
> Com isso a Vercel instala e faz o build apenas de `apps/web`, sem precisar do
> Turborepo ou do workspace raiz. Como `apps/web` não importa nenhum `@selva/*`
> local, funciona de forma completamente independente na conta gratuita.

### 2.2 Variáveis de ambiente na Vercel

Em **Settings → Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://<IP_ORACLE>` (ou `https://api.selva.eco.br`) |
| `NEXT_PUBLIC_APP_URL` | `https://<seu-projeto>.vercel.app` |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x...` (ou deixe vazio se contrato não implantado) |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Sua chave Alchemy |

> Referência completa: `apps/web/.env.production.example`

### 2.3 Fazer o deploy

Clique em **Deploy**. A Vercel irá:
1. Entrar em `apps/web/`
2. Rodar `npm install` + `next build`
3. Publicar em `https://<projeto>.vercel.app`

Todo `git push` na branch principal dispara redeploy automático.

---

## Parte 3 — Sincronizar CORS após deploy

Com a URL final da Vercel em mãos, atualize no servidor Oracle:

```bash
nano ~/blockchain-system/apps/api/.env
# Ajuste FRONTEND_URL e APP_URL para a URL real da Vercel

pm2 restart selva-api
```

---

## Parte 4 — Smoke test pós-deploy

Execute nesta ordem:

```bash
# 1. API respondendo
curl http://<IP_ORACLE>/api/sync/status
# Esperado: {"blockchainEnabled":false,"pendingOperations":0}

# 2. Swagger (abrir no navegador)
# http://<IP_ORACLE>/api/docs

# 3. Frontend carregando
# https://<projeto>.vercel.app

# 4. Login como admin
# Abrir o site → conectar carteira (MetaMask) → assinar → deve ir para o dashboard
# O link "Usuários" no menu lateral confirma que o isAdmin está funcionando

# 5. Cadastrar uma produção (modo offline)
# Dashboard → Cadastrar produção → preencher → submeter
# Verificar em: GET http://<IP_ORACLE>/api/products

# 6. Página pública de QR Code (sem login)
# https://<projeto>.vercel.app/p/<codigo-da-producao>
```

---

## Parte 5 — Comandos úteis no servidor Oracle

```bash
# Ver logs em tempo real
pm2 logs selva-api

# Reiniciar (necessário após alterar .env)
pm2 restart selva-api

# Status dos processos
pm2 status

# Rodar migration de emergência
cd ~/blockchain-system/apps/api
npx prisma migrate deploy
pm2 restart selva-api

# Ver banco de dados via Prisma Studio (só localmente, não no servidor)
cd apps/api && npx prisma studio
```

---

## Observações importantes

| Ponto | Detalhe |
|---|---|
| **Modo offline** | `BLOCKCHAIN_ENABLED=false` — a API funciona sem contrato. Produções ficam `syncStatus=PENDING` até o contrato ser implantado. |
| **Contrato** | Deploy na Polygon Amoy ainda pendente (aguardando MATIC no faucet). Enquanto isso, use modo offline. |
| **HTTPS na API** | Para HTTPS, configure um domínio e use `sudo certbot --nginx`. Sem isso, `NEXT_PUBLIC_API_URL` deve ser `http://...`. |
| **Banco** | O Supabase já está em nuvem. Use sempre `prisma migrate deploy` (não `migrate dev`) em produção. |
| **Admin** | O admin é definido por `ADMIN_WALLET_ADDRESS` no `.env` da API — qualquer carteira pode ser admin sem precisar estar cadastrada como usuário. |
