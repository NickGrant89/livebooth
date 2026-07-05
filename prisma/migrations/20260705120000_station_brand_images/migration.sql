-- Station logo + banner (URL or data URL stored as text)
ALTER TABLE "RadioStation" ADD COLUMN "avatarUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RadioStation" ADD COLUMN "bannerUrl" TEXT NOT NULL DEFAULT '';
