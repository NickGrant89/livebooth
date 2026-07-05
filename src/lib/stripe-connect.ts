import { getStripe, isStripeConfigured, appBaseUrl } from "./stripe";

export function isStripeConnectEnabled(): boolean {
  return isStripeConfigured() && process.env.STRIPE_CONNECT_ENABLED !== "false";
}

export function stripePayoutCurrency(): string {
  return (process.env.STRIPE_PAYOUT_CURRENCY ?? "gbp").toLowerCase();
}

export function isStripeAutoPayoutEnabled(): boolean {
  return isStripeConnectEnabled() && process.env.STRIPE_CONNECT_AUTO_PAYOUT !== "false";
}

export function stripeConnectCountry(): string {
  return (process.env.STRIPE_CONNECT_COUNTRY ?? "GB").toUpperCase();
}

export async function getOrCreateConnectAccount(user: {
  id: string;
  email: string;
  stripeConnectAccountId: string | null;
}): Promise<string> {
  if (user.stripeConnectAccountId) return user.stripeConnectAccountId;

  const stripe = getStripe();
  const account = await stripe.accounts.create({
    type: "express",
    country: stripeConnectCountry(),
    email: user.email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata: { liveboothUserId: user.id },
  });

  return account.id;
}

export async function createConnectOnboardingLink(accountId: string): Promise<string> {
  const stripe = getStripe();
  const base = appBaseUrl();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/wallet?connect=refresh`,
    return_url: `${base}/wallet?connect=return`,
    type: "account_onboarding",
  });
  return link.url;
}

export async function createConnectDashboardLink(accountId: string): Promise<string | null> {
  try {
    const stripe = getStripe();
    const link = await stripe.accounts.createLoginLink(accountId);
    return link.url;
  } catch {
    return null;
  }
}

export async function syncConnectAccountStatus(accountId: string): Promise<boolean> {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);
  return Boolean(account.details_submitted && account.payouts_enabled);
}

export async function transferWithdrawalPayout(opts: {
  accountId: string;
  amountCents: number;
  withdrawalRequestId: string;
  userId: string;
}): Promise<{ transferId: string }> {
  const stripe = getStripe();
  const transfer = await stripe.transfers.create({
    amount: opts.amountCents,
    currency: stripePayoutCurrency(),
    destination: opts.accountId,
    metadata: {
      withdrawalRequestId: opts.withdrawalRequestId,
      userId: opts.userId,
    },
  });
  return { transferId: transfer.id };
}
