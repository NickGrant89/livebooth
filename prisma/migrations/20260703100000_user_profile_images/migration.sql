-- Profile banner + photo (URL or data URL stored as text)
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "bannerUrl" TEXT NOT NULL DEFAULT '';
