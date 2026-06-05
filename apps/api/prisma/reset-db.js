"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Limpando banco de dados...');
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
//# sourceMappingURL=reset-db.js.map