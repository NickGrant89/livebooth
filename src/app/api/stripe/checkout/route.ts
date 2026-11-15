import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { DROP_PACKS } from "@/lib/constants";
import {
  appBaseUrl,
  formatPackPrice,
  getDropPack,
  getStripe,
  getStripeAccountCurrency,
  isStripeConfigured,
} from "@/lib/stripe";
import { prisma } from "@/lib/db";
import Stripe from "stripe";
import { z } from "zod";

const schema = z.object({ packId: z.string() });

export async function GET() {
  const currency = getStripeAccountCurrency();

  return json({
    configured: isStripeConfigured(),
    currency,
    packs: DROP_PACKS.map((p) => ({
      id: p.id,
      dropAmount: p.dropAmount,
      priceLabel: formatPackPrice(p.priceCents, currency),
      popular: p.popular,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (!isStripeConfigured()) {
    return error("Stripe not configured — use dev top-up or set STRIPE_SECRET_KEY", 503);
  }

  try {
    const body = schema.parse(await request.json());
    const pack = getDropPack(body.packId);
    if (!pack) return error("Invalid pack");

    const stripe = getStripe();
    const base = appBaseUrl();
    const currency = getStripeAccountCurrency();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: auth.email,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: pack.priceCents,
            product_data: {
              name: `${pack.label} — LiveBooth`,
              description: `${pack.dropAmount} DROP for tips, requests, and unlocks`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: auth.id,
        dropAmount: String(pack.dropAmount),
        packId: pack.id,
      },
      success_url: `${base}/wallet?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/wallet?purchase=cancelled`,
    });

    if (!session.url) return error("Checkout failed", 500);

    try {
      await prisma.stripePurchase.upsert({
        where: { stripeSessionId: session.id },
        create: {
          userId: auth.id,
          stripeSessionId: session.id,
          dropAmount: pack.dropAmount,
          amountCents: pack.priceCents,
          status: "pending",
        },
        update: {},
      });
    } catch (e) {
      console.error("stripe purchase record:", e);
    }

    return json({ url: session.url, sessionId: session.id });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid pack");
    console.error("stripe checkout:", e);
    const message =
      e instanceof Stripe.errors.StripeError ? e.message : "Checkout failed";
    return error(message, 500);
  }
}
