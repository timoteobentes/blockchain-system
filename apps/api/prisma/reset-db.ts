/**
 * Script para limpar todas as tabelas do banco antes de testes.
 * Preserva o schema (não dropa tabelas).
 *
 * Uso: npx ts-node prisma/reset-db.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Limpando banco de dados...');

  // Ordem importa por causa das foreign keys
  await prisma.trace.deleteMany({});
  await prisma.pendingOperation.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.syncState.deleteMany({});

  console.log('Banco limpo. Tabelas vazias:');
  console.log('  - Trace:', await prisma.trace.count());
  console.log('  - PendingOperation:', await prisma.pendingOperation.count());
  console.log('  - Product:', await prisma.product.count());
  console.log('  - User:', await prisma.user.count());
  console.log('  - SyncState:', await prisma.syncState.count());
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
