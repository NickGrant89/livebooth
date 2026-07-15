import "server-only";

import { prisma } from "./db";
import {
  isDemoEconomyMode,
  WITHDRAWAL_KYC_MONTHLY_USD_CENTS,
  WITHDRAWAL_MIN_ACCOUNT_AGE_DAYS,
} from "./constants";

export type { WithdrawQuote } from "./redeem-quote";
export { quoteWithdrawal, formatUsd } from "./redeem-quote";

/** DROP that can be cashed out — creator earnings only, not welcome bonus or purchases. */
export async function getWithdrawableDrop(userId: string): Promise<{
  balance: number;
  totalEarned: number;
  alreadyWithdrawn: number;
  withdrawable: number;
}> {
  const bal = await prisma.beatBalance.findUnique({ where: { userId } });
  const balance = bal?.balance ?? 0;
  const totalEarned = bal?.totalEarned ?? 0;

  const agg = await prisma.withdrawalRequest.aggregate({
    where: { userId, status: { in: ["pending", "approved", "paid"] } },
    _sum: { dropAmount: true },
  });
  const alreadyWithdrawn = Math.round(agg._sum.dropAmount ?? 0);
  const earningsRemaining = Math.max(0, totalEarned - alreadyWithdrawn);
  const withdrawable = Math.min(balance, earningsRemaining);

  return { balance, totalEarned, alreadyWithdrawn, withdrawable };
}

export async function checkWithdrawEligibility(
  userId: string,
  userCreatedAt: Date,
  deps: {
    countTipsSent: () => Promise<number>;
    countStreamsHosted: () => Promise<number>;
    sumPaidWithdrawalsUsdCentsThisMonth: () => Promise<number>;
    totalEarned?: number;
  },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const earned = deps.totalEarned ?? 0;
  if (earned <= 0) {
    return {
      ok: false,
      reason:
        "Only DROP you've earned from streams (tips, unlocks, requests) can be cashed out — welcome bonus and purchases are for spending in the booth",
    };
  }

  if (!isDemoEconomyMode()) {
    const ageMs = Date.now() - userCreatedAt.getTime();
    const minAgeMs = WITHDRAWAL_MIN_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000;
    if (ageMs < minAgeMs) {
      return {
        ok: false,
        reason: `Account must be at least ${WITHDRAWAL_MIN_ACCOUNT_AGE_DAYS} days old to withdraw`,
      };
    }

    const [tips, streams] = await Promise.all([deps.countTipsSent(), deps.countStreamsHosted()]);
    if (tips === 0 && streams === 0) {
      return {
        ok: false,
        reason: "Complete at least one tip or hosted stream before withdrawing",
      };
    }
  }

  const monthUsd = await deps.sumPaidWithdrawalsUsdCentsThisMonth();
  if (monthUsd >= WITHDRAWAL_KYC_MONTHLY_USD_CENTS) {
    return {
      ok: false,
      reason: "Monthly withdrawal limit reached — KYC required (contact support)",
    };
  }

  return { ok: true };
}
