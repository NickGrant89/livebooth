-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RadioStation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "avatar" TEXT NOT NULL DEFAULT '',
    "tier" TEXT NOT NULL DEFAULT 'community',
    "relayUrl" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RadioStation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StationResident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stationId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "showTitle" TEXT NOT NULL DEFAULT '',
    "slotDay" INTEGER,
    "slotHour" INTEGER,
    "slotLabel" TEXT,
    CONSTRAINT "StationResident_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "RadioStation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StationResident_djId_fkey" FOREIGN KEY ("djId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    CONSTRAINT "Stream_djId_fkey" FOREIGN KEY ("djId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Stream_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "RadioStation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Stream" ("bpmRange", "createdAt", "djId", "endedAt", "firstTipBonusGiven", "genre", "id", "ingestKey", "peakViewers", "playbackUrl", "recapJson", "startedAt", "status", "title", "totalTips", "vodUrl") SELECT "bpmRange", "createdAt", "djId", "endedAt", "firstTipBonusGiven", "genre", "id", "ingestKey", "peakViewers", "playbackUrl", "recapJson", "startedAt", "status", "title", "totalTips", "vodUrl" FROM "Stream";
DROP TABLE "Stream";
ALTER TABLE "new_Stream" RENAME TO "Stream";
CREATE INDEX "Stream_djId_idx" ON "Stream"("djId");
CREATE INDEX "Stream_status_idx" ON "Stream"("status");
CREATE INDEX "Stream_stationId_idx" ON "Stream"("stationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RadioStation_slug_key" ON "RadioStation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RadioStation_ownerId_key" ON "RadioStation"("ownerId");

-- CreateIndex
CREATE INDEX "StationResident_stationId_idx" ON "StationResident"("stationId");

-- CreateIndex
CREATE INDEX "StationResident_djId_idx" ON "StationResident"("djId");

-- CreateIndex
CREATE UNIQUE INDEX "StationResident_stationId_djId_key" ON "StationResident"("stationId", "djId");
