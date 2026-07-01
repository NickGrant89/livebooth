-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DjStake" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fanId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DjStake_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DjStake_djId_fkey" FOREIGN KEY ("djId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StreamHighlight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "streamId" TEXT NOT NULL,
    "tipId" TEXT,
    "timestampMs" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "username" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StreamHighlight_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    CONSTRAINT "Stream_djId_fkey" FOREIGN KEY ("djId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Stream" ("bpmRange", "createdAt", "djId", "endedAt", "genre", "id", "ingestKey", "peakViewers", "playbackUrl", "startedAt", "status", "title", "totalTips", "vodUrl") SELECT "bpmRange", "createdAt", "djId", "endedAt", "genre", "id", "ingestKey", "peakViewers", "playbackUrl", "startedAt", "status", "title", "totalTips", "vodUrl" FROM "Stream";
DROP TABLE "Stream";
ALTER TABLE "new_Stream" RENAME TO "Stream";
CREATE INDEX "Stream_djId_idx" ON "Stream"("djId");
CREATE INDEX "Stream_status_idx" ON "Stream"("status");
CREATE TABLE "new_TrackUnlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "streamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackTitle" TEXT NOT NULL,
    "trackArtist" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "platformFee" REAL NOT NULL,
    "isFirstUnlock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrackUnlock_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrackUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TrackUnlock" ("amount", "createdAt", "id", "platformFee", "streamId", "trackArtist", "trackTitle", "userId") SELECT "amount", "createdAt", "id", "platformFee", "streamId", "trackArtist", "trackTitle", "userId" FROM "TrackUnlock";
DROP TABLE "TrackUnlock";
ALTER TABLE "new_TrackUnlock" RENAME TO "TrackUnlock";
CREATE INDEX "TrackUnlock_streamId_idx" ON "TrackUnlock"("streamId");
CREATE INDEX "TrackUnlock_userId_idx" ON "TrackUnlock"("userId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "avatar" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'fan',
    "walletAddress" TEXT,
    "genres" TEXT NOT NULL DEFAULT '[]',
    "watchMinutes" REAL NOT NULL DEFAULT 0,
    "streamStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStreamWeek" TEXT,
    "lastDailyClaimAt" DATETIME,
    "weeklySlotDay" INTEGER,
    "weeklySlotHour" INTEGER,
    "weeklySlotLabel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatar", "bio", "createdAt", "displayName", "email", "genres", "id", "passwordHash", "role", "updatedAt", "username", "walletAddress", "watchMinutes") SELECT "avatar", "bio", "createdAt", "displayName", "email", "genres", "id", "passwordHash", "role", "updatedAt", "username", "walletAddress", "watchMinutes" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DjStake_djId_idx" ON "DjStake"("djId");

-- CreateIndex
CREATE UNIQUE INDEX "DjStake_fanId_djId_key" ON "DjStake"("fanId", "djId");

-- CreateIndex
CREATE INDEX "StreamHighlight_streamId_idx" ON "StreamHighlight"("streamId");
