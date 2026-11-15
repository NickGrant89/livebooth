import { prisma } from "./db";

/**
 * Fan spend creates withdrawable creator earnings only after that fan has paid
 * for DROP. Welcome bonus, quests, and achievements stay spend-only.
 */
export async function fanPaymentCountsAsCreatorEarnings(fanId: string): Promise<boolean> {
  const purchaseCount = await prisma.stripePurchase.count({
    where: { userId: fanId, status: "completed" },
  });
  return purchaseCount > 0;
}
