-- Collab partner gets their own RTMP stream for remote B2B video
ALTER TABLE "StreamCollab" ADD COLUMN "partnerStreamId" TEXT;
CREATE UNIQUE INDEX "StreamCollab_partnerStreamId_key" ON "StreamCollab"("partnerStreamId");
ALTER TABLE "StreamCollab" ADD CONSTRAINT "StreamCollab_partnerStreamId_fkey" FOREIGN KEY ("partnerStreamId") REFERENCES "Stream"("id") ON DELETE SET NULL ON UPDATE CASCADE;
