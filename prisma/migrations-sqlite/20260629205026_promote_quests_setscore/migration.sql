-- CreateTable
CREATE TABLE "FanQuestProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questDate" TEXT NOT NULL,
    "questKey" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "reward" INTEGER NOT NULL,
    "completedAt" DATETIME,
    "claimedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FanQuestProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "providerStreamId" TEXT,
    "promotionTier" TEXT,
    "promotedUntil" DATETIME,
    "promotionPaidAt" DATETIME,
    "promotionDropAmount" REAL NOT NULL DEFAULT 0,
    "setScore" INTEGER,
    "setGrade" TEXT,
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
    "aiRiskScore" REAL,
    "aiLastScanAt" DATETIME,
    CONSTRAINT "Stream_djId_fkey" FOREIGN KEY ("djId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Stream_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "RadioStation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Stream" ("aiLastScanAt", "aiRiskScore", "bpmRange", "createdAt", "djId", "endedAt", "firstTipBonusGiven", "genre", "id", "ingestKey", "moderationReason", "moderationStatus", "peakViewers", "playbackUrl", "providerStreamId", "recapJson", "reportCount", "startedAt", "stationId", "status", "title", "totalTips", "vodUrl") SELECT "aiLastScanAt", "aiRiskScore", "bpmRange", "createdAt", "djId", "endedAt", "firstTipBonusGiven", "genre", "id", "ingestKey", "moderationReason", "moderationStatus", "peakViewers", "playbackUrl", "providerStreamId", "recapJson", "reportCount", "startedAt", "stationId", "status", "title", "totalTips", "vodUrl" FROM "Stream";
DROP TABLE "Stream";
ALTER TABLE "new_Stream" RENAME TO "Stream";
CREATE INDEX "Stream_djId_idx" ON "Stream"("djId");
CREATE INDEX "Stream_status_idx" ON "Stream"("status");
CREATE INDEX "Stream_stationId_idx" ON "Stream"("stationId");
CREATE INDEX "Stream_providerStreamId_idx" ON "Stream"("providerStreamId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FanQuestProgress_userId_questDate_idx" ON "FanQuestProgress"("userId", "questDate");

-- CreateIndex
CREATE UNIQUE INDEX "FanQuestProgress_userId_questDate_slot_key" ON "FanQuestProgress"("userId", "questDate", "slot");
