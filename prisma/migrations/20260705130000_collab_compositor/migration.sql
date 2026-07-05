-- Server-side FFmpeg compositor output for collab streams
ALTER TABLE "StreamCollab" ADD COLUMN "compositorActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StreamCollab" ADD COLUMN "compositedIngestKey" TEXT;
ALTER TABLE "StreamCollab" ADD COLUMN "compositorStartedAt" TIMESTAMP(3);
