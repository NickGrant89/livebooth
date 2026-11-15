import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { buyDropFromStripe } from "@/lib/ledger";
import { prisma } from "@/lib/db";
import { syncConnectAccountStatus } from "@/lib/stripe-connect";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

function connectAccountId(event: Stripe.Event): string | null {
  const object = event.data.object as { id?: string; related_object?: { id?: string } };
  if (object.id?.startsWith("acct_")) return object.id;
  if (object.related_object?.id?.startsWith("acct_")) return object.related_object.id;
  return null;
}

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

    if (session.payment_status === "paid" && userId && dropAmount > 0 && session.id) {
      const amountCents = session.amount_total ?? 0;
      try {
        await buyDropFromStripe(userId, dropAmount, session.id, amountCents);
      } catch (err) {
        console.error("stripe webhook credit:", err);
        return NextResponse.json({ error: "Could not credit purchase" }, { status: 500 });
      }
    }
  }

  const accountId = connectAccountId(event);
  if (accountId && (event.type === "account.updated" || event.type.startsWith("v2.core.account"))) {
    const linked = await prisma.user.findFirst({
      where: { stripeConnectAccountId: accountId },
      select: { id: true },
    });
    if (linked) {
      try {
        const onboarded = await syncConnectAccountStatus(accountId);
        await prisma.user.update({
          where: { id: linked.id },
          data: { stripeConnectOnboarded: onboarded },
        });
      } catch (err) {
        console.error("stripe connect status:", err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
