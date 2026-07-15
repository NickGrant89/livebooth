import { prisma } from "./db";

/**
 * Fan spend that creates withdrawable DJ/station earnings must come from "organic"
 * sources — not signup welcome bonus moved via alt accounts.
 */
export async function fanPaymentCountsAsCreatorEarnings(fanId: string): Promise<boolean> {
  const [purchaseCount, balance] = await Promise.all([
    prisma.stripePurchase.count({
      where: { userId: fanId, status: "completed" },
    }),
    prisma.beatBalance.findUnique({
      where: { userId: fanId },
      select: { totalEarned: true },
    }),
  ]);
  if (purchaseCount > 0) return true;
  if ((balance?.totalEarned ?? 0) > 0) return true;
  return false;
}
