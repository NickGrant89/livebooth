import { NextResponse } from "next/server";
import { buyDropFromStripe } from "@/lib/ledger";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret?.startsWith("whsec_")) {
    return NextResponse.json({ error: "Webhook secret missing" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("stripe webhook verify:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const dropAmount = Number(session.metadata?.dropAmount ?? 0);

    if (userId && dropAmount > 0 && session.id) {
      const amountCents = session.amount_total ?? 0;
      await buyDropFromStripe(userId, dropAmount, session.id, amountCents);
    }
  }

  return NextResponse.json({ received: true });
}
