-- Granular moderator permissions (JSON array of permission ids)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "moderatorPermissions" TEXT NOT NULL DEFAULT '[]';
