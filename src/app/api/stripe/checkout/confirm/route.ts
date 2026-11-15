import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { buyDropFromStripe } from "@/lib/ledger";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { z } from "zod";

const schema = z.object({
  sessionId: z.string().min(8).max(255),
});

/** Credits DROP when the buyer returns from Checkout. Idempotent with the webhook. */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (!isStripeConfigured()) {
    return error("Stripe not configured", 503);
  }

  try {
    const body = schema.parse(await request.json());
    const session = await getStripe().checkout.sessions.retrieve(body.sessionId);

    if (session.metadata?.userId !== auth.id) {
      return error("This payment does not belong to your account", 403);
    }
    if (session.payment_status !== "paid") {
      return error("Payment is not complete yet", 402);
    }

    const dropAmount = Number(session.metadata?.dropAmount ?? 0);
    if (!session.id || dropAmount <= 0) {
      return error("Invalid checkout session");
    }

    const balance = await buyDropFromStripe(
      auth.id,
      dropAmount,
      session.id,
      session.amount_total ?? 0,
    );

    return json({
      ok: true,
      dropAmount,
      balance: balance.balance,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid checkout session");
    console.error("stripe checkout confirm:", e);
    return error("Could not confirm payment", 500);
  }
}
