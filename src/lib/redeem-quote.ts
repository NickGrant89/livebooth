import {
  REDEEM_USD_CENTS_PER_DROP,
  WITHDRAWAL_FEE_BPS,
  effectiveWithdrawMinDrop,
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
