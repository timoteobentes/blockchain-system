-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED';

-- CreateTable
CREATE TABLE "PendingOperation" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "userAddress" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "errorMsg" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingOperation_userAddress_status_idx" ON "PendingOperation"("userAddress", "status");

-- CreateIndex
CREATE INDEX "PendingOperation_status_idx" ON "PendingOperation"("status");

-- CreateIndex
CREATE INDEX "Product_syncStatus_idx" ON "Product"("syncStatus");

-- CreateIndex
CREATE INDEX "User_syncStatus_idx" ON "User"("syncStatus");
