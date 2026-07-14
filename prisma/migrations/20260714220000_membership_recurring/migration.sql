-- Membership v2: recurring tiers + billing fields on stake tables
ALTER TABLE "DjStake" ADD COLUMN "tier" TEXT NOT NULL DEFAULT 'member';
ALTER TABLE "DjStake" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "DjStake" ADD COLUMN "monthlyAmount" DOUBLE PRECISION NOT NULL DEFAULT 25;
ALTER TABLE "DjStake" ADD COLUMN "nextBillingAt" TIMESTAMP(3);
ALTER TABLE "DjStake" ADD COLUMN "lifetimePaid" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "StationStake" ADD COLUMN "tier" TEXT NOT NULL DEFAULT 'member';
ALTER TABLE "StationStake" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "StationStake" ADD COLUMN "monthlyAmount" DOUBLE PRECISION NOT NULL DEFAULT 25;
ALTER TABLE "StationStake" ADD COLUMN "nextBillingAt" TIMESTAMP(3);
ALTER TABLE "StationStake" ADD COLUMN "lifetimePaid" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Legacy locked stakes → member tier with 30-day grace before first renewal
UPDATE "DjStake"
SET
  "monthlyAmount" = CASE WHEN "amount" >= 75 THEN 75 ELSE 25 END,
  "tier" = CASE WHEN "amount" >= 75 THEN 'supporter' ELSE 'member' END,
  "lifetimePaid" = "amount",
  "nextBillingAt" = NOW() + INTERVAL '30 days'
WHERE "nextBillingAt" IS NULL;

UPDATE "StationStake"
SET
  "monthlyAmount" = CASE WHEN "amount" >= 75 THEN 75 ELSE 25 END,
  "tier" = CASE WHEN "amount" >= 75 THEN 'supporter' ELSE 'member' END,
  "lifetimePaid" = "amount",
  "nextBillingAt" = NOW() + INTERVAL '30 days'
WHERE "nextBillingAt" IS NULL;

CREATE INDEX "DjStake_status_nextBillingAt_idx" ON "DjStake"("status", "nextBillingAt");
CREATE INDEX "StationStake_status_nextBillingAt_idx" ON "StationStake"("status", "nextBillingAt");
