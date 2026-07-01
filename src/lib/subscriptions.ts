import { prisma } from "./db";
import {
  VIP_REQUEST_COST,
  VIP_TRACK_UNLOCK_COST,
  REQUEST_COST,
  TRACK_UNLOCK_COST,
} from "./constants";

export async function isVipSubscriber(fanId: string, djId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where: { fanId_djId: { fanId, djId } },
  });
  if (!sub || sub.status !== "active") return false;
  return sub.nextBillingAt.getTime() > Date.now();
}

export async function getFanStreamPricing(fanId: string, djId: string) {
  const vip = await isVipSubscriber(fanId, djId);
  return {
    vip,
    requestCost: vip ? VIP_REQUEST_COST : REQUEST_COST,
    trackUnlockCost: vip ? VIP_TRACK_UNLOCK_COST : TRACK_UNLOCK_COST,
  };
}

export async function listActiveSubscriptions(fanId: string) {
  return prisma.subscription.findMany({
    where: { fanId, status: "active", nextBillingAt: { gt: new Date() } },
    include: { dj: { select: { username: true, displayName: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });
}
