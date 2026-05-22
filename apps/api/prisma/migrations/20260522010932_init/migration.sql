-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "userHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "isProducer" BOOLEAN NOT NULL DEFAULT false,
    "onChainAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "volume" INTEGER NOT NULL,
    "origin" TEXT NOT NULL,
    "producerAddress" TEXT NOT NULL,
    "currentOwnerAddress" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "onChainAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trace" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "docHash" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "blockTimestamp" TIMESTAMP(3) NOT NULL,
    "txHash" TEXT,
    "blockNumber" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastBlock" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_userHash_key" ON "User"("userHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "User_walletAddress_idx" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Product_lotId_key" ON "Product"("lotId");

-- CreateIndex
CREATE INDEX "Product_producerAddress_idx" ON "Product"("producerAddress");

-- CreateIndex
CREATE INDEX "Product_currentOwnerAddress_idx" ON "Product"("currentOwnerAddress");

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "Product"("active");

-- CreateIndex
CREATE INDEX "Trace_productId_idx" ON "Trace"("productId");

-- AddForeignKey
ALTER TABLE "Trace" ADD CONSTRAINT "Trace_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
