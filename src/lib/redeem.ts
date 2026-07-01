import {
  REDEEM_USD_CENTS_PER_DROP,
  WITHDRAWAL_FEE_BPS,
  effectiveWithdrawMinDrop,
  isDemoEconomyMode,
  WITHDRAWAL_KYC_MONTHLY_USD_CENTS,
  WITHDRAWAL_MIN_ACCOUNT_AGE_DAYS,
} from "./constants";

export type WithdrawQuote = {
  dropAmount: number;
  feeDrop: number;
  netDrop: number;
  usdCents: number;
  netUsdCents: number;
  redeemRateLabel: string;
  feePercent: number;
  minDrop: number;
};

export function quoteWithdrawal(dropAmount: number): WithdrawQuote {
  const feeDrop = Math.ceil((dropAmount * WITHDRAWAL_FEE_BPS) / 10_000);
  const netDrop = dropAmount - feeDrop;
  const usdCents = Math.floor(dropAmount * REDEEM_USD_CENTS_PER_DROP);
  const netUsdCents = Math.floor(netDrop * REDEEM_USD_CENTS_PER_DROP);
  return {
    dropAmount,
    feeDrop,
    netDrop,
    usdCents,
    netUsdCents,
    redeemRateLabel: `$${(REDEEM_USD_CENTS_PER_DROP / 100).toFixed(4)}/DROP`,
    feePercent: WITHDRAWAL_FEE_BPS / 100,
    minDrop: effectiveWithdrawMinDrop(),
  };
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function checkWithdrawEligibility(
  userId: string,
  userCreatedAt: Date,
  deps: {
    countTipsSent: () => Promise<number>;
    countStreamsHosted: () => Promise<number>;
    sumPaidWithdrawalsUsdCentsThisMonth: () => Promise<number>;
  },
): Promise<{ ok: true } | { ok: false; reason: string }> {
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
