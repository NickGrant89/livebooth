import { prisma } from "./db";
import { debitUser, creditUser } from "./ledger";
import { MIN_STAKE_AMOUNT, DJ_MILESTONES } from "./constants";
import { notifyUser } from "./notifications";
import { distributeProportionalRewards } from "./staking-rewards";

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

  try {
    await evaluateDjMilestones(djId);
  } catch (err) {
    console.error("dj milestones after stake:", err);
  }

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

async function getDjMilestoneMetrics(djId: string) {
  const [followerCount, stakeTotals, tipAgg] = await Promise.all([
    prisma.follow.count({ where: { followingId: djId } }),
    getDjStakeTotal(djId),
    prisma.stream.aggregate({
      where: { djId, status: "ended" },
      _sum: { totalTips: true },
    }),
  ]);
  return {
    followers: followerCount,
    staked: stakeTotals.total,
    tips: tipAgg._sum.totalTips ?? 0,
  };
}

export async function evaluateDjMilestones(djId: string) {
  const dj = await prisma.user.findUnique({ where: { id: djId } });
  if (!dj) return [];

  const claimed = new Set(JSON.parse(dj.milestonesClaimed || "[]") as string[]);
  const metrics = await getDjMilestoneMetrics(djId);
  const newlyClaimed: string[] = [];

  for (const milestone of DJ_MILESTONES) {
    if (claimed.has(milestone.key)) continue;
    const value = metrics[milestone.metric];
    if (value < milestone.threshold) continue;

    const stakers = await prisma.djStake.findMany({ where: { djId } });
    const rewards = distributeProportionalRewards(stakers, milestone.rewardPool);

    for (const [fanId, reward] of rewards) {
      await creditUser(fanId, reward, "dj_milestone", djId, {
        milestone: milestone.key,
        label: milestone.label,
      });
      await notifyUser(
        fanId,
        "dj_milestone",
        `${dj.displayName} milestone unlocked`,
        `You earned +${reward} DROP — ${milestone.label}`,
        `/dj/${dj.username}`,
      );
    }

    claimed.add(milestone.key);
    newlyClaimed.push(milestone.key);
  }

  if (newlyClaimed.length > 0) {
    await prisma.user.update({
      where: { id: djId },
      data: { milestonesClaimed: JSON.stringify([...claimed]) },
    });
  }

  return newlyClaimed;
}

export async function getDjMilestoneProgress(djId: string) {
  const dj = await prisma.user.findUnique({ where: { id: djId } });
  const claimed = new Set(JSON.parse(dj?.milestonesClaimed || "[]") as string[]);
  const metrics = await getDjMilestoneMetrics(djId);

  return DJ_MILESTONES.map((m) => ({
    ...m,
    current: metrics[m.metric],
    claimed: claimed.has(m.key),
    progress: Math.min(100, Math.round((metrics[m.metric] / m.threshold) * 100)),
  }));
}
