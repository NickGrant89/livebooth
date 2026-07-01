-- AlterTable
ALTER TABLE "Stream" ADD COLUMN "providerStreamId" TEXT;

-- CreateTable
CREATE TABLE "StreamChatBan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "streamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bannedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StreamChatBan_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StreamChatBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StreamChatBan_bannedBy_fkey" FOREIGN KEY ("bannedBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessageReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'spam',
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessageReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatMessageReport_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatMessageReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StreamChatBan_streamId_idx" ON "StreamChatBan"("streamId");

-- CreateIndex
CREATE UNIQUE INDEX "StreamChatBan_streamId_userId_key" ON "StreamChatBan"("streamId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessageReport_status_idx" ON "ChatMessageReport"("status");

-- CreateIndex
CREATE INDEX "ChatMessageReport_streamId_idx" ON "ChatMessageReport"("streamId");

-- CreateIndex
CREATE INDEX "ChatMessageReport_createdAt_idx" ON "ChatMessageReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessageReport_messageId_reporterId_key" ON "ChatMessageReport"("messageId", "reporterId");

-- CreateIndex
CREATE INDEX "Stream_providerStreamId_idx" ON "Stream"("providerStreamId");
