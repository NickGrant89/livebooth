-- Admin features: 2FA, support unread tracking
ALTER TABLE "User" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SupportTicket" ADD COLUMN "lastMessageRole" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "lastMessageAt" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN "adminReadAt" TIMESTAMP(3);
