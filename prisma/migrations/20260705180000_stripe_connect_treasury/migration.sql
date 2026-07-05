-- Stripe Connect payouts + withdrawal transfer tracking
ALTER TABLE "User" ADD COLUMN "stripeConnectAccountId" TEXT;
ALTER TABLE "User" ADD COLUMN "stripeConnectOnboarded" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "User_stripeConnectAccountId_key" ON "User"("stripeConnectAccountId");

ALTER TABLE "WithdrawalRequest" ADD COLUMN "stripeTransferId" TEXT;
ALTER TABLE "WithdrawalRequest" ADD COLUMN "payoutMethod" TEXT NOT NULL DEFAULT 'manual';
