import Stripe from "stripe";
import { DROP_PACKS, type DropPackId } from "./constants";

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_"));
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_")) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function getDropPack(packId: string) {
  return DROP_PACKS.find((p) => p.id === packId);
}

export function formatPackPrice(cents: number, currency = "usd"): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

let accountCurrency: string | null = null;

/** Settlement currency on the Stripe account. UK accounts reject USD charges. */
export async function getStripeAccountCurrency(): Promise<string> {
  if (accountCurrency) return accountCurrency;
  const account = await getStripe().accounts.retrieve(null);
  accountCurrency = (account.default_currency || "gbp").toLowerCase();
  return accountCurrency;
}

export function appBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return process.env.VERCEL_URL.startsWith("http")
      ? process.env.VERCEL_URL
      : `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3008";
}

export type { DropPackId };
