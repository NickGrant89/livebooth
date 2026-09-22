-- Profile social links (JSON) and optional featured replay stream id
ALTER TABLE "User" ADD COLUMN "socialLinks" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "User" ADD COLUMN "featuredStreamId" TEXT;
