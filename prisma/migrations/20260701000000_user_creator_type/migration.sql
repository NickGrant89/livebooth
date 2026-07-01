-- Add creator sub-type for DJs, musicians, bands, producers (streaming role stays `dj`)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "creatorType" TEXT NOT NULL DEFAULT 'dj';
