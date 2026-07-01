import { prisma } from "./db";
import { debitUser } from "./ledger";
import { PROMOTION_TIERS } from "./constants";

export type PromotionTierId = keyof typeof PROMOTION_TIERS;

export function isPromotionActive(stream: {
  promotionTier?: string | null;
  promotedUntil?: Date | null;
}): boolean {
  if (!stream.promotionTier || !stream.promotedUntil) return false;
  return stream.promotedUntil.getTime() > Date.now();
}

export function getPromotionScoreBoost(stream: {
  promotionTier?: string | null;
  promotedUntil?: Date | null;
}): number {
  if (!isPromotionActive(stream)) return 0;
  const tier = PROMOTION_TIERS[stream.promotionTier as PromotionTierId];
  return tier?.scoreBoost ?? 0;
}

export function isSponsoredHero(stream: {
  promotionTier?: string | null;
  promotedUntil?: Date | null;
}): boolean {
  return isPromotionActive(stream) && stream.promotionTier === "hero";
}

export async function purchaseStreamPromotion(
  streamId: string,
  djId: string,
  tierId: PromotionTierId,
) {
  const tier = PROMOTION_TIERS[tierId];
  if (!tier) return { ok: false as const, error: "Invalid tier" };

  const stream = await prisma.stream.findFirst({
    where: { id: streamId, djId, status: "live" },
  });
  if (!stream) return { ok: false as const, error: "Stream not live" };

  if (tierId === "hero") {
    const existingHero = await prisma.stream.findFirst({
      where: {
        id: { not: streamId },
        status: "live",
        promotionTier: "hero",
        promotedUntil: { gt: new Date() },
      },
    });
    if (existingHero) {
      return { ok: false as const, error: "Hero spotlight is already taken. Try Boost grid or wait." };
    }
  }

  const now = Date.now();
  const extendFrom =
    stream.promotionTier === tierId &&
    stream.promotedUntil &&
    stream.promotedUntil.getTime() > now
      ? stream.promotedUntil.getTime()
      : now;

  const promotedUntil = new Date(extendFrom + tier.durationMs);

  const paid = await debitUser(djId, tier.price, "promotion", streamId, {
    tier: tierId,
    promotedUntil: promotedUntil.toISOString(),
  });
  if (!paid) return { ok: false as const, error: "Insufficient DROP balance" };

  await prisma.stream.update({
    where: { id: streamId },
    data: {
      promotionTier: tierId,
      promotedUntil,
      promotionPaidAt: new Date(),
      promotionDropAmount: { increment: tier.price },
    },
  });

  return {
    ok: true as const,
    tier: tierId,
    promotedUntil: promotedUntil.toISOString(),
    price: tier.price,
  };
}

export async function cancelStreamPromotion(streamId: string) {
  await prisma.stream.update({
    where: { id: streamId },
    data: {
      promotionTier: null,
      promotedUntil: null,
    },
  });
}
