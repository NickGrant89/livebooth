import { prisma } from "./db";
import { isPromotionActive } from "./promotion";
import { PROMOTION_TIERS } from "./constants";

export async function getAdminPromotions() {
  const now = new Date();

  const [activeStreams, recentPromoted, revenueAgg, heroOccupied] = await Promise.all([
    prisma.stream.findMany({
      where: {
        promotionTier: { not: null },
        promotedUntil: { gt: now },
      },
      include: {
        dj: { select: { username: true, displayName: true, avatar: true } },
      },
      orderBy: [{ promotionTier: "desc" }, { promotedUntil: "asc" }],
    }),
    prisma.stream.findMany({
      where: { promotionDropAmount: { gt: 0 } },
      orderBy: { promotionPaidAt: "desc" },
      take: 25,
      include: {
        dj: { select: { username: true, displayName: true } },
      },
    }),
    prisma.stream.aggregate({ _sum: { promotionDropAmount: true } }),
    prisma.stream.findFirst({
      where: {
        status: "live",
        promotionTier: "hero",
        promotedUntil: { gt: now },
      },
      select: {
        id: true,
        title: true,
        dj: { select: { username: true, displayName: true } },
        promotedUntil: true,
      },
    }),
  ]);

  return {
    heroOccupied: heroOccupied
      ? {
          streamId: heroOccupied.id,
          title: heroOccupied.title,
          djUsername: heroOccupied.dj.username,
          djName: heroOccupied.dj.displayName,
          promotedUntil: heroOccupied.promotedUntil?.toISOString(),
        }
      : null,
    totalRevenue: Math.round(revenueAgg._sum.promotionDropAmount ?? 0),
    active: activeStreams.map((s) => ({
      streamId: s.id,
      title: s.title,
      status: s.status,
      tier: s.promotionTier,
      tierLabel: s.promotionTier
        ? PROMOTION_TIERS[s.promotionTier as keyof typeof PROMOTION_TIERS]?.label
        : null,
      promotedUntil: s.promotedUntil?.toISOString(),
      totalSpent: s.promotionDropAmount,
      peakViewers: s.peakViewers,
      totalTips: s.totalTips,
      dj: s.dj,
      isLive: s.status === "live" && isPromotionActive(s),
    })),
    recent: recentPromoted.map((s) => ({
      streamId: s.id,
      title: s.title,
      status: s.status,
      tier: s.promotionTier,
      totalSpent: s.promotionDropAmount,
      paidAt: s.promotionPaidAt?.toISOString(),
      dj: s.dj,
      active: isPromotionActive(s),
    })),
  };
}
