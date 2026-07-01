import { prisma } from "./db";
import { debitUser, creditUser } from "./ledger";
import { MIN_STAKE_AMOUNT } from "./constants";

export async function getStake(fanId: string, djId: string) {
  return prisma.djStake.findUnique({
    where: { fanId_djId: { fanId, djId } },
  });
}

export async function getDjStakeTotal(djId: string) {
  const agg = await prisma.djStake.aggregate({
    where: { djId },
    _sum: { amount: true },
    _count: true,
  });
  return { total: agg._sum.amount ?? 0, stakers: agg._count };
}

export async function stakeOnDj(fanId: string, djId: string, amount: number) {
  if (amount < MIN_STAKE_AMOUNT) {
    return { ok: false as const, error: `Minimum stake is ${MIN_STAKE_AMOUNT} DROP` };
  }
  if (fanId === djId) return { ok: false as const, error: "Cannot stake on yourself" };

  const existing = await getStake(fanId, djId);
  const delta = existing ? amount - existing.amount : amount;
  if (delta <= 0) return { ok: false as const, error: "Stake amount must increase" };

  const ok = await debitUser(fanId, delta, "stake", djId);
  if (!ok) return { ok: false as const, error: "Insufficient DROP" };

  await prisma.djStake.upsert({
    where: { fanId_djId: { fanId, djId } },
    create: { fanId, djId, amount },
    update: { amount },
  });

  return { ok: true as const, amount };
}

export async function unstakeFromDj(fanId: string, djId: string) {
  const stake = await getStake(fanId, djId);
  if (!stake) return { ok: false as const, error: "No stake found" };

  await prisma.djStake.delete({ where: { id: stake.id } });
  await creditUser(fanId, stake.amount, "unstake", djId);
  return { ok: true as const, amount: stake.amount };
}

export async function listTopStakers(djId: string, limit = 5) {
  return prisma.djStake.findMany({
    where: { djId },
    orderBy: { amount: "desc" },
    take: limit,
    include: { fan: { select: { username: true, displayName: true, avatar: true } } },
  });
}
