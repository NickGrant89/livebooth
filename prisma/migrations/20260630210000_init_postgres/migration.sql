-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "avatar" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'fan',
    "walletAddress" TEXT,
    "genres" TEXT NOT NULL DEFAULT '[]',
    "watchMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "streamStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStreamWeek" TEXT,
    "lastDailyClaimAt" TIMESTAMP(3),
    "weeklySlotDay" INTEGER,
    "weeklySlotHour" INTEGER,
    "weeklySlotLabel" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeatBalance" (
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "totalEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "BeatBalance_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stream" (
    "id" TEXT NOT NULL,
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
    "promotedUntil" TIMESTAMP(3),
    "promotionPaidAt" TIMESTAMP(3),
    "promotionDropAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "setScore" INTEGER,
    "setGrade" TEXT,
    "peakViewers" INTEGER NOT NULL DEFAULT 0,
    "totalTips" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstTipBonusGiven" BOOLEAN NOT NULL DEFAULT false,
    "recapJson" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stationId" TEXT,
    "moderationStatus" TEXT NOT NULL DEFAULT 'ok',
    "moderationReason" TEXT,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "aiRiskScore" DOUBLE PRECISION,
    "aiLastScanAt" TIMESTAMP(3),

    CONSTRAINT "Stream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamPresence" (
    "streamId" TEXT NOT NULL,
    "viewerKey" TEXT NOT NULL,
    "userId" TEXT,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamPresence_pkey" PRIMARY KEY ("streamId","viewerKey")
);

-- CreateTable
CREATE TABLE "StreamCollab" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "partnerDjId" TEXT NOT NULL,
    "splitRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "StreamCollab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NowPlaying" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "bpm" INTEGER,
    "musicalKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NowPlaying_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isTip" BOOLEAN NOT NULL DEFAULT false,
    "tipAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "timestampMs" INTEGER,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackUnlock" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackTitle" TEXT NOT NULL,
    "trackArtist" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "isFirstUnlock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrowdRequest" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "trackTitle" TEXT NOT NULL,
    "trackArtist" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrowdRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'active',
    "nextBillingAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripePurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "dropAmount" DOUBLE PRECISION NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StripePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "rewardTokens" DOUBLE PRECISION NOT NULL,
    "requirement" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'dj',
    "metricKey" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unlockedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "claimTxHash" TEXT,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformStats" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "value" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "PlatformStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DjStake" (
    "id" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DjStake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamHighlight" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "tipId" TEXT,
    "timestampMs" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "username" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadioStation" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadioStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationResident" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "showTitle" TEXT NOT NULL DEFAULT '',
    "slotDay" INTEGER,
    "slotHour" INTEGER,
    "slotLabel" TEXT,

    CONSTRAINT "StationResident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StationFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationStake" (
    "id" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationStake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamReport" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamChatBan" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bannedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamChatBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessageReport" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'spam',
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FanQuestProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questDate" TEXT NOT NULL,
    "questKey" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "reward" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "claimedStreamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FanQuestProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamAiScan" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "flags" TEXT NOT NULL DEFAULT '[]',
    "action" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamAiScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dropAmount" DOUBLE PRECISION NOT NULL,
    "feeDrop" DOUBLE PRECISION NOT NULL,
    "netDrop" DOUBLE PRECISION NOT NULL,
    "usdCents" INTEGER NOT NULL,
    "netUsdCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectReason" TEXT,
    "reviewedBy" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "Stream_djId_idx" ON "Stream"("djId");

-- CreateIndex
CREATE INDEX "Stream_status_idx" ON "Stream"("status");

-- CreateIndex
CREATE INDEX "Stream_stationId_idx" ON "Stream"("stationId");

-- CreateIndex
CREATE INDEX "Stream_providerStreamId_idx" ON "Stream"("providerStreamId");

-- CreateIndex
CREATE INDEX "StreamPresence_streamId_lastSeen_idx" ON "StreamPresence"("streamId", "lastSeen");

-- CreateIndex
CREATE UNIQUE INDEX "StreamCollab_streamId_key" ON "StreamCollab"("streamId");

-- CreateIndex
CREATE UNIQUE INDEX "NowPlaying_streamId_key" ON "NowPlaying"("streamId");

-- CreateIndex
CREATE INDEX "ChatMessage_streamId_idx" ON "ChatMessage"("streamId");

-- CreateIndex
CREATE INDEX "Tip_streamId_idx" ON "Tip"("streamId");

-- CreateIndex
CREATE INDEX "Tip_toUserId_idx" ON "Tip"("toUserId");

-- CreateIndex
CREATE INDEX "TrackUnlock_streamId_idx" ON "TrackUnlock"("streamId");

-- CreateIndex
CREATE INDEX "TrackUnlock_userId_idx" ON "TrackUnlock"("userId");

-- CreateIndex
CREATE INDEX "CrowdRequest_streamId_idx" ON "CrowdRequest"("streamId");

-- CreateIndex
CREATE INDEX "CrowdRequest_status_idx" ON "CrowdRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_fanId_djId_key" ON "Subscription"("fanId", "djId");

-- CreateIndex
CREATE UNIQUE INDEX "StripePurchase_stripeSessionId_key" ON "StripePurchase"("stripeSessionId");

-- CreateIndex
CREATE INDEX "StripePurchase_userId_idx" ON "StripePurchase"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

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

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RadioStation_slug_key" ON "RadioStation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RadioStation_ownerId_key" ON "RadioStation"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "RadioStation_flagshipDjId_key" ON "RadioStation"("flagshipDjId");

-- CreateIndex
CREATE INDEX "StationResident_stationId_idx" ON "StationResident"("stationId");

-- CreateIndex
CREATE INDEX "StationResident_djId_idx" ON "StationResident"("djId");

-- CreateIndex
CREATE UNIQUE INDEX "StationResident_stationId_djId_key" ON "StationResident"("stationId", "djId");

-- CreateIndex
CREATE INDEX "StationFollow_stationId_idx" ON "StationFollow"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "StationFollow_followerId_stationId_key" ON "StationFollow"("followerId", "stationId");

-- CreateIndex
CREATE INDEX "StationStake_stationId_idx" ON "StationStake"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "StationStake_fanId_stationId_key" ON "StationStake"("fanId", "stationId");

-- CreateIndex
CREATE INDEX "StreamReport_streamId_idx" ON "StreamReport"("streamId");

-- CreateIndex
CREATE INDEX "StreamReport_createdAt_idx" ON "StreamReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StreamReport_streamId_reporterId_key" ON "StreamReport"("streamId", "reporterId");

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
CREATE INDEX "FanQuestProgress_userId_questDate_idx" ON "FanQuestProgress"("userId", "questDate");

-- CreateIndex
CREATE INDEX "FanQuestProgress_claimedStreamId_idx" ON "FanQuestProgress"("claimedStreamId");

-- CreateIndex
CREATE UNIQUE INDEX "FanQuestProgress_userId_questDate_slot_key" ON "FanQuestProgress"("userId", "questDate", "slot");

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

-- CreateIndex
CREATE INDEX "StreamAiScan_streamId_createdAt_idx" ON "StreamAiScan"("streamId", "createdAt");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_userId_createdAt_idx" ON "WithdrawalRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_status_createdAt_idx" ON "WithdrawalRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeatBalance" ADD CONSTRAINT "BeatBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_djId_fkey" FOREIGN KEY ("djId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "RadioStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamPresence" ADD CONSTRAINT "StreamPresence_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamCollab" ADD CONSTRAINT "StreamCollab_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NowPlaying" ADD CONSTRAINT "NowPlaying_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackUnlock" ADD CONSTRAINT "TrackUnlock_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackUnlock" ADD CONSTRAINT "TrackUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrowdRequest" ADD CONSTRAINT "CrowdRequest_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrowdRequest" ADD CONSTRAINT "CrowdRequest_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_djId_fkey" FOREIGN KEY ("djId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripePurchase" ADD CONSTRAINT "StripePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DjStake" ADD CONSTRAINT "DjStake_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DjStake" ADD CONSTRAINT "DjStake_djId_fkey" FOREIGN KEY ("djId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamHighlight" ADD CONSTRAINT "StreamHighlight_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadioStation" ADD CONSTRAINT "RadioStation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadioStation" ADD CONSTRAINT "RadioStation_flagshipDjId_fkey" FOREIGN KEY ("flagshipDjId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationResident" ADD CONSTRAINT "StationResident_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "RadioStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationResident" ADD CONSTRAINT "StationResident_djId_fkey" FOREIGN KEY ("djId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationFollow" ADD CONSTRAINT "StationFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationFollow" ADD CONSTRAINT "StationFollow_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "RadioStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationStake" ADD CONSTRAINT "StationStake_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationStake" ADD CONSTRAINT "StationStake_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "RadioStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamReport" ADD CONSTRAINT "StreamReport_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamReport" ADD CONSTRAINT "StreamReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamChatBan" ADD CONSTRAINT "StreamChatBan_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamChatBan" ADD CONSTRAINT "StreamChatBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamChatBan" ADD CONSTRAINT "StreamChatBan_bannedBy_fkey" FOREIGN KEY ("bannedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessageReport" ADD CONSTRAINT "ChatMessageReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessageReport" ADD CONSTRAINT "ChatMessageReport_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessageReport" ADD CONSTRAINT "ChatMessageReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FanQuestProgress" ADD CONSTRAINT "FanQuestProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamAiScan" ADD CONSTRAINT "StreamAiScan_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
