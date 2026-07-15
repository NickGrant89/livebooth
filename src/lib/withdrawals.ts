import { prisma } from "./db";
import { debitUser, creditUser } from "./ledger";
import { effectiveWithdrawMinDrop } from "./constants";
import { checkWithdrawEligibility, getWithdrawableDrop, quoteWithdrawal } from "./redeem";
import {
  isStripeAutoPayoutEnabled,
  transferWithdrawalPayout,
} from "./stripe-connect";

export async function listUserWithdrawals(userId: string) {
  return prisma.withdrawalRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function requestWithdrawal(userId: string, dropAmount: number) {
  const minDrop = effectiveWithdrawMinDrop();
  if (dropAmount < minDrop) {
    return { ok: false as const, error: `Minimum withdrawal is ${minDrop} DROP` };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { balance: { select: { totalEarned: true } } },
  });
  if (!user) return { ok: false as const, error: "User not found" };

  const { withdrawable } = await getWithdrawableDrop(userId);
  if (withdrawable < minDrop) {
    return {
      ok: false as const,
      error:
        withdrawable <= 0
          ? "Only DROP you've earned from streams can be cashed out — welcome bonus and purchases stay in your booth wallet"
          : `You need at least ${minDrop} DROP in withdrawable earnings (you have ${Math.floor(withdrawable)} DROP available to cash out)`,
    };
  }
  if (dropAmount > withdrawable) {
    return {
      ok: false as const,
      error: `Only ${Math.floor(withdrawable)} DROP from stream earnings can be cashed out`,
    };
  }

  const pending = await prisma.withdrawalRequest.count({
    where: { userId, status: { in: ["pending", "approved"] } },
  });
  if (pending > 0) {
    return { ok: false as const, error: "You already have a pending withdrawal" };
  }

  const eligibility = await checkWithdrawEligibility(userId, user.createdAt, {
    totalEarned: user.balance?.totalEarned ?? 0,
    countTipsSent: () => prisma.tip.count({ where: { fromUserId: userId } }),
    countStreamsHosted: () => prisma.stream.count({ where: { djId: userId } }),
    sumPaidWithdrawalsUsdCentsThisMonth: async () => {
      const start = new Date();
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
      const rows = await prisma.withdrawalRequest.findMany({
        where: { userId, status: "paid", paidAt: { gte: start } },
        select: { netUsdCents: true },
      });
      return rows.reduce((s, r) => s + r.netUsdCents, 0);
    },
  });
  if (!eligibility.ok) {
    return { ok: false as const, error: eligibility.reason };
  }

  const quote = quoteWithdrawal(dropAmount);
  const debited = await debitUser(userId, dropAmount, "withdraw_request", undefined, {
    netUsdCents: quote.netUsdCents,
  });
  if (!debited) {
    return { ok: false as const, error: "Insufficient DROP balance" };
  }

  const row = await prisma.withdrawalRequest.create({
    data: {
      userId,
      dropAmount: quote.dropAmount,
      feeDrop: quote.feeDrop,
      netDrop: quote.netDrop,
      usdCents: quote.usdCents,
      netUsdCents: quote.netUsdCents,
      status: "pending",
    },
  });

  return { ok: true as const, request: row, quote };
}

export async function adminUpdateWithdrawal(
  requestId: string,
  adminId: string,
  action: "approve" | "reject" | "mark_paid",
  rejectReason?: string,
) {
  const row = await prisma.withdrawalRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          stripeConnectAccountId: true,
          stripeConnectOnboarded: true,
        },
      },
    },
  });
  if (!row) return { ok: false as const, error: "Request not found" };

  if (action === "approve") {
    if (row.status !== "pending") return { ok: false as const, error: "Not pending" };
    const updated = await prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: { status: "approved", reviewedBy: adminId },
    });
    return { ok: true as const, request: updated };
  }

  if (action === "mark_paid") {
    if (row.status !== "approved" && row.status !== "pending") {
      return { ok: false as const, error: "Cannot mark paid from this status" };
    }

    let stripeTransferId: string | undefined;
    let payoutMethod = "manual";

    if (
      isStripeAutoPayoutEnabled() &&
      row.user.stripeConnectOnboarded &&
      row.user.stripeConnectAccountId
    ) {
      try {
        const payout = await transferWithdrawalPayout({
          accountId: row.user.stripeConnectAccountId,
          amountCents: row.netUsdCents,
          withdrawalRequestId: requestId,
          userId: row.userId,
        });
        stripeTransferId = payout.transferId;
        payoutMethod = "stripe_connect";
      } catch (e) {
        console.error("stripe connect payout:", e);
        return {
          ok: false as const,
          error: "Stripe payout failed — use manual payout or retry",
        };
      }
    }

    const updated = await prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: {
        status: "paid",
        paidAt: new Date(),
        reviewedBy: adminId,
        stripeTransferId,
        payoutMethod,
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        userId: row.userId,
        amount: 0,
        type: "withdraw_paid",
        reference: requestId,
        metadata: JSON.stringify({
          dropAmount: row.dropAmount,
          netUsdCents: row.netUsdCents,
          adminId,
        }),
      },
    });
    return { ok: true as const, request: updated };
  }

  if (action === "reject") {
    if (!["pending", "approved"].includes(row.status)) {
      return { ok: false as const, error: "Cannot reject" };
    }
    await creditUser(row.userId, row.dropAmount, "withdraw_refund", requestId, {
      reason: rejectReason ?? "rejected",
    }, { countAsEarned: false });
    const updated = await prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: {
        status: "rejected",
        rejectReason: rejectReason ?? "Rejected by admin",
        reviewedBy: adminId,
      },
    });
    return { ok: true as const, request: updated };
  }

  return { ok: false as const, error: "Unknown action" };
}

export async function listAdminWithdrawals(status?: string) {
  return prisma.withdrawalRequest.findMany({
    where: status && status !== "all" ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: {
        select: {
          username: true,
          displayName: true,
          email: true,
          role: true,
          stripeConnectOnboarded: true,
        },
      },
    },
  });
}
