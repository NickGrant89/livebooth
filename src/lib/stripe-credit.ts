import { prisma } from "./db";
import { buyDropFromStripe } from "./ledger";
import { getStripe, isStripeConfigured } from "./stripe";

/** Credits DROP for Checkout sessions that were paid but not applied. */
export async function reconcilePaidStripePurchases(userId: string): Promise<number> {
  if (!isStripeConfigured()) return 0;

  const pending = await prisma.stripePurchase.findMany({
    where: { userId, status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  if (pending.length === 0) return 0;

  const stripe = getStripe();
  let credited = 0;
  for (const row of pending) {
    try {
      const session = await stripe.checkout.sessions.retrieve(row.stripeSessionId);
      if (session.payment_status !== "paid" || !session.id) continue;
      if (session.metadata?.userId && session.metadata.userId !== userId) continue;
      const dropAmount = Number(session.metadata?.dropAmount ?? row.dropAmount);
      if (dropAmount <= 0) continue;
      await buyDropFromStripe(
        userId,
        dropAmount,
        session.id,
        session.amount_total ?? row.amountCents,
      );
      credited += dropAmount;
    } catch (e) {
      console.error("stripe reconcile:", e);
    }
  }
  return credited;
}
