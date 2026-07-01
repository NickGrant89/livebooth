-- AlterTable
ALTER TABLE "Stream" ADD COLUMN "aiLastScanAt" DATETIME;
ALTER TABLE "Stream" ADD COLUMN "aiRiskScore" REAL;

-- CreateTable
CREATE TABLE "StreamAiScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "streamId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "riskScore" REAL NOT NULL,
    "flags" TEXT NOT NULL DEFAULT '[]',
    "action" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StreamAiScan_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StreamAiScan_streamId_createdAt_idx" ON "StreamAiScan"("streamId", "createdAt");
