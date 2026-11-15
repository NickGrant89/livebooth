import { getStripe, getStripeAccountCurrency, isStripeConfigured, appBaseUrl } from "./stripe";

export function isStripeConnectEnabled(): boolean {
  return isStripeConfigured() && process.env.STRIPE_CONNECT_ENABLED !== "false";
}

/** Cash-out transfers are pounds, matching card charges. */
export function stripePayoutCurrency(): string {
  return getStripeAccountCurrency();
}

export function isStripeAutoPayoutEnabled(): boolean {
  return isStripeConnectEnabled() && process.env.STRIPE_CONNECT_AUTO_PAYOUT !== "false";
}

export function stripeConnectCountry(): string {
  return (process.env.STRIPE_CONNECT_COUNTRY ?? "GB").toUpperCase();
}

function connectReturnUrls() {
  const base = appBaseUrl();
  return {
    refresh_url: `${base}/wallet?connect=refresh`,
    return_url: `${base}/wallet?connect=return`,
  };
}

export async function getOrCreateConnectAccount(user: {
  id: string;
  email: string;
  stripeConnectAccountId: string | null;
}): Promise<string> {
  if (user.stripeConnectAccountId) return user.stripeConnectAccountId;

  const stripe = getStripe();
  const account = await stripe.v2.core.accounts.create({
    contact_email: user.email,
    dashboard: "express",
    identity: { country: stripeConnectCountry() },
    defaults: {
      responsibilities: {
        fees_collector: "application",
        losses_collector: "application",
      },
    },
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: { requested: true },
          },
        },
      },
    },
    metadata: { liveboothUserId: user.id },
    include: ["configuration.recipient"],
  });

  return account.id;
}

export async function createConnectOnboardingLink(accountId: string): Promise<string> {
  const stripe = getStripe();
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        ...connectReturnUrls(),
      },
    },
  });
  return link.url;
}

export async function createConnectDashboardLink(accountId: string): Promise<string | null> {
  try {
    const stripe = getStripe();
    const link = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_update",
        account_update: {
          configurations: ["recipient"],
          ...connectReturnUrls(),
        },
      },
    });
    return link.url;
  } catch {
    return null;
  }
}

export async function syncConnectAccountStatus(accountId: string): Promise<boolean> {
  const stripe = getStripe();
  const account = await stripe.v2.core.accounts.retrieve(accountId, {
    include: ["configuration.recipient"],
  });
  const transfers =
    account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
  return transfers === "active";
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
