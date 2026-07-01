-- CreateTable
CREATE TABLE "StationFollow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "followerId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StationFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StationFollow_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "RadioStation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StationStake" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fanId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StationStake_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StationStake_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "RadioStation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RadioStation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "avatar" TEXT NOT NULL DEFAULT '',
    "tier" TEXT NOT NULL DEFAULT 'community',
    "relayUrl" TEXT,
    "ownerId" TEXT NOT NULL,
    "flagshipDjId" TEXT,
    "embedPrimaryColor" TEXT NOT NULL DEFAULT '#53fc18',
    "embedHideBranding" BOOLEAN NOT NULL DEFAULT false,
    "milestonesClaimed" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RadioStation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RadioStation_flagshipDjId_fkey" FOREIGN KEY ("flagshipDjId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RadioStation" ("avatar", "createdAt", "id", "name", "ownerId", "relayUrl", "slug", "tagline", "tier", "updatedAt") SELECT "avatar", "createdAt", "id", "name", "ownerId", "relayUrl", "slug", "tagline", "tier", "updatedAt" FROM "RadioStation";
DROP TABLE "RadioStation";
ALTER TABLE "new_RadioStation" RENAME TO "RadioStation";
CREATE UNIQUE INDEX "RadioStation_slug_key" ON "RadioStation"("slug");
CREATE UNIQUE INDEX "RadioStation_ownerId_key" ON "RadioStation"("ownerId");
CREATE UNIQUE INDEX "RadioStation_flagshipDjId_key" ON "RadioStation"("flagshipDjId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "StationFollow_stationId_idx" ON "StationFollow"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "StationFollow_followerId_stationId_key" ON "StationFollow"("followerId", "stationId");

-- CreateIndex
CREATE INDEX "StationStake_stationId_idx" ON "StationStake"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "StationStake_fanId_stationId_key" ON "StationStake"("fanId", "stationId");
