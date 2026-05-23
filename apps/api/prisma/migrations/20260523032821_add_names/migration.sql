-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "currentOwnerName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "originType" TEXT NOT NULL DEFAULT 'PESSOA',
ADD COLUMN     "producerName" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Trace" ADD COLUMN     "fromName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "toName" TEXT NOT NULL DEFAULT '';
