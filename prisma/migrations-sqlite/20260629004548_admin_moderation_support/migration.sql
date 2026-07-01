-- AlterTable
ALTER TABLE "User" ADD COLUMN "suspendedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "suspendedReason" TEXT;

-- CreateTable
CREATE TABLE "StreamReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "streamId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StreamReport_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StreamReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "adminNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Stream" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "djId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "bpmRange" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "ingestKey" TEXT,
    "playbackUrl" TEXT,
    "vodUrl" TEXT,
    "peakViewers" INTEGER NOT NULL DEFAULT 0,
    "totalTips" REAL NOT NULL DEFAULT 0,
    "firstTipBonusGiven" BOOLEAN NOT NULL DEFAULT false,
    "recapJson" TEXT,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stationId" TEXT,
    "moderationStatus" TEXT NOT NULL DEFAULT 'ok',
    "moderationReason" TEXT,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Stream_djId_fkey" FOREIGN KEY ("djId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Stream_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "RadioStation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Stream" ("bpmRange", "createdAt", "djId", "endedAt", "firstTipBonusGiven", "genre", "id", "ingestKey", "peakViewers", "playbackUrl", "recapJson", "startedAt", "stationId", "status", "title", "totalTips", "vodUrl") SELECT "bpmRange", "createdAt", "djId", "endedAt", "firstTipBonusGiven", "genre", "id", "ingestKey", "peakViewers", "playbackUrl", "recapJson", "startedAt", "stationId", "status", "title", "totalTips", "vodUrl" FROM "Stream";
DROP TABLE "Stream";
ALTER TABLE "new_Stream" RENAME TO "Stream";
CREATE INDEX "Stream_djId_idx" ON "Stream"("djId");
CREATE INDEX "Stream_status_idx" ON "Stream"("status");
CREATE INDEX "Stream_stationId_idx" ON "Stream"("stationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "StreamReport_streamId_idx" ON "StreamReport"("streamId");

-- CreateIndex
CREATE INDEX "StreamReport_createdAt_idx" ON "StreamReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StreamReport_streamId_reporterId_key" ON "StreamReport"("streamId", "reporterId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");
