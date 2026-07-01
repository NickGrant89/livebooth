import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { DROP_PACKS } from "@/lib/constants";
import {
  appBaseUrl,
  formatPackPrice,
  getDropPack,
  getStripe,
  isStripeConfigured,
} from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ packId: z.string() });

export async function GET() {
  return json({
    configured: isStripeConfigured(),
    packs: DROP_PACKS.map((p) => ({
      id: p.id,
      dropAmount: p.dropAmount,
      priceLabel: formatPackPrice(p.priceCents),
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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
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

    if (!session.id) return error("Checkout failed", 500);

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

    return json({ url: session.url, sessionId: session.id });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid pack");
    console.error("stripe checkout:", e);
    return error("Checkout failed", 500);
  }
}
