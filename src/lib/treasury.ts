import { prisma } from "./db";
import { REDEEM_USD_CENTS_PER_DROP, WITHDRAWAL_FEE_BPS, effectiveWithdrawMinDrop } from "./constants";

export async function getTreasuryStats() {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [
    stripePurchases,
    totalUserBalance,
    pendingWithdrawals,
    approvedWithdrawals,
    paidWithdrawals,
    paidThisMonth,
    promotionRevenue,
    recentLedger,
  ] = await Promise.all([
    prisma.stripePurchase.aggregate({
      where: { status: "completed" },
      _sum: { amountCents: true, dropAmount: true },
      _count: true,
    }),
    prisma.beatBalance.aggregate({ _sum: { balance: true, totalEarned: true } }),
    prisma.withdrawalRequest.aggregate({
      where: { status: "pending" },
      _sum: { dropAmount: true, netUsdCents: true },
      _count: true,
    }),
    prisma.withdrawalRequest.aggregate({
      where: { status: "approved" },
      _sum: { dropAmount: true, netUsdCents: true },
      _count: true,
    }),
    prisma.withdrawalRequest.aggregate({
      where: { status: "paid" },
      _sum: { dropAmount: true, netUsdCents: true },
      _count: true,
    }),
    prisma.withdrawalRequest.aggregate({
      where: { status: "paid", paidAt: { gte: monthStart } },
      _sum: { netUsdCents: true },
      _count: true,
    }),
    prisma.stream.aggregate({ _sum: { promotionDropAmount: true } }),
    prisma.ledgerEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: { select: { username: true } } },
    }),
  ]);

  const devPurchases = await prisma.ledgerEntry.aggregate({
    where: { type: "purchase" },
    _sum: { amount: true },
    _count: true,
  });

  const fiatInCents = stripePurchases._sum.amountCents ?? 0;
  const dropSoldStripe = stripePurchases._sum.dropAmount ?? 0;

  return {
    redeem: {
      usdCentsPerDrop: REDEEM_USD_CENTS_PER_DROP,
      feeBps: WITHDRAWAL_FEE_BPS,
      minDrop: effectiveWithdrawMinDrop(),
    },
    inflow: {
      fiatInCents,
      dropSoldStripe,
      stripePurchaseCount: stripePurchases._count,
      devTopUpDrop: devPurchases._sum.amount ?? 0,
      devTopUpCount: devPurchases._count,
    },
    liabilities: {
      userBalanceDrop: Math.round(totalUserBalance._sum.balance ?? 0),
      totalEarnedDrop: Math.round(totalUserBalance._sum.totalEarned ?? 0),
    },
    outflow: {
      paidCount: paidWithdrawals._count,
      paidDrop: Math.round(paidWithdrawals._sum.dropAmount ?? 0),
      paidUsdCents: paidWithdrawals._sum.netUsdCents ?? 0,
      paidThisMonthUsdCents: paidThisMonth._sum.netUsdCents ?? 0,
      paidThisMonthCount: paidThisMonth._count,
    },
    queue: {
      pendingCount: pendingWithdrawals._count,
      pendingDrop: Math.round(pendingWithdrawals._sum.dropAmount ?? 0),
      pendingUsdCents: pendingWithdrawals._sum.netUsdCents ?? 0,
      approvedCount: approvedWithdrawals._count,
      approvedUsdCents: approvedWithdrawals._sum.netUsdCents ?? 0,
    },
    revenue: {
      promotionDrop: Math.round(promotionRevenue._sum.promotionDropAmount ?? 0),
    },
    recentLedger: recentLedger.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      username: e.user.username,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
