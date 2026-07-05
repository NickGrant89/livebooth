import { prisma } from "./db";
import { REDEEM_USD_CENTS_PER_DROP, WITHDRAWAL_FEE_BPS, effectiveWithdrawMinDrop } from "./constants";
import { getOnChainTreasuryStats } from "./onchain-treasury";

/** Public, PII-free economy stats for /transparency. */
export async function getPublicEconomyStats() {
  const [
    stripePurchases,
    totalUserBalance,
    paidWithdrawals,
    pendingWithdrawals,
    tipFees,
    unlockFees,
    requestFees,
    promotionRevenue,
    totalTips,
    onChain,
  ] = await Promise.all([
    prisma.stripePurchase.aggregate({
      where: { status: "completed" },
      _sum: { amountCents: true, dropAmount: true },
      _count: true,
    }),
    prisma.beatBalance.aggregate({ _sum: { balance: true, totalEarned: true } }),
    prisma.withdrawalRequest.aggregate({
      where: { status: "paid" },
      _sum: { dropAmount: true, netUsdCents: true },
      _count: true,
    }),
    prisma.withdrawalRequest.aggregate({
      where: { status: { in: ["pending", "approved"] } },
      _count: true,
      _sum: { netUsdCents: true },
    }),
    prisma.tip.aggregate({ _sum: { platformFee: true, amount: true }, _count: true }),
    prisma.trackUnlock.aggregate({ _sum: { platformFee: true }, _count: true }),
    prisma.crowdRequest.aggregate({
      where: { status: "accepted" },
      _sum: { platformFee: true },
      _count: true,
    }),
    prisma.stream.aggregate({ _sum: { promotionDropAmount: true } }),
    prisma.tip.aggregate({ _sum: { amount: true }, _count: true }),
    getOnChainTreasuryStats(),
  ]);

  const platformFeeDrop =
    Math.round(tipFees._sum.platformFee ?? 0) +
    Math.round(unlockFees._sum.platformFee ?? 0) +
    Math.round(requestFees._sum.platformFee ?? 0) +
    Math.round(promotionRevenue._sum.promotionDropAmount ?? 0);

  return {
    updatedAt: new Date().toISOString(),
    redeem: {
      usdCentsPerDrop: REDEEM_USD_CENTS_PER_DROP,
      feePercent: WITHDRAWAL_FEE_BPS / 100,
      minDrop: effectiveWithdrawMinDrop(),
    },
    inflow: {
      fiatInCents: stripePurchases._sum.amountCents ?? 0,
      dropSoldStripe: Math.round(stripePurchases._sum.dropAmount ?? 0),
      stripePurchaseCount: stripePurchases._count,
    },
    circulation: {
      userBalanceDrop: Math.round(totalUserBalance._sum.balance ?? 0),
      totalEarnedDrop: Math.round(totalUserBalance._sum.totalEarned ?? 0),
    },
    activity: {
      totalTipsDrop: Math.round(totalTips._sum.amount ?? 0),
      tipCount: totalTips._count,
      trackUnlockCount: unlockFees._count,
      crowdRequestCount: requestFees._count,
    },
    platformRevenue: {
      feeDrop: platformFeeDrop,
      tipFeesDrop: Math.round(tipFees._sum.platformFee ?? 0),
      unlockFeesDrop: Math.round(unlockFees._sum.platformFee ?? 0),
      requestFeesDrop: Math.round(requestFees._sum.platformFee ?? 0),
      promotionDrop: Math.round(promotionRevenue._sum.promotionDropAmount ?? 0),
    },
    withdrawals: {
      paidCount: paidWithdrawals._count,
      paidDrop: Math.round(paidWithdrawals._sum.dropAmount ?? 0),
      paidFiatCents: paidWithdrawals._sum.netUsdCents ?? 0,
      pendingCount: pendingWithdrawals._count,
      pendingFiatCents: pendingWithdrawals._sum.netUsdCents ?? 0,
    },
    onChain,
  };
}
