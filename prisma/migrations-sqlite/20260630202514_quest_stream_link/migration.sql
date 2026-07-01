-- AlterTable
ALTER TABLE "FanQuestProgress" ADD COLUMN "claimedStreamId" TEXT;

-- CreateIndex
CREATE INDEX "FanQuestProgress_claimedStreamId_idx" ON "FanQuestProgress"("claimedStreamId");
