import { prisma } from "./db";
import { debitUser, creditUser } from "./ledger";
import { MIN_STAKE_AMOUNT, STATION_MILESTONES } from "./constants";
import { getStationStats } from "./stations";

export async function getStationFollowCount(stationId: string) {
  return prisma.stationFollow.count({ where: { stationId } });
}

export async function isFollowingStation(followerId: string, stationId: string) {
  const row = await prisma.stationFollow.findUnique({
    where: { followerId_stationId: { followerId, stationId } },
  });
  return Boolean(row);
}

export async function followStation(followerId: string, stationId: string) {
  await prisma.stationFollow.upsert({
    where: { followerId_stationId: { followerId, stationId } },
    create: { followerId, stationId },
    update: {},
  });
  await evaluateStationMilestones(stationId);
  return { ok: true as const };
}

export async function unfollowStation(followerId: string, stationId: string) {
  await prisma.stationFollow.deleteMany({ where: { followerId, stationId } });
  return { ok: true as const };
}

export async function getStationStake(fanId: string, stationId: string) {
  return prisma.stationStake.findUnique({
    where: { fanId_stationId: { fanId, stationId } },
  });
}

export async function getStationStakeTotal(stationId: string) {
  const agg = await prisma.stationStake.aggregate({
    where: { stationId },
    _sum: { amount: true },
    _count: true,
  });
  return { total: agg._sum.amount ?? 0, stakers: agg._count };
}

export async function stakeOnStation(fanId: string, stationId: string, amount: number) {
  if (amount < MIN_STAKE_AMOUNT) {
    return { ok: false as const, error: `Minimum stake is ${MIN_STAKE_AMOUNT} DROP` };
  }

  const station = await prisma.radioStation.findUnique({ where: { id: stationId } });
  if (!station) return { ok: false as const, error: "Station not found" };
  if (fanId === station.ownerId) {
    return { ok: false as const, error: "Cannot stake on your own station" };
  }

  const existing = await getStationStake(fanId, stationId);
  const delta = existing ? amount - existing.amount : amount;
  if (delta <= 0) return { ok: false as const, error: "Stake amount must increase" };

  const ok = await debitUser(fanId, delta, "station_stake", stationId);
  if (!ok) return { ok: false as const, error: "Insufficient DROP" };

  await prisma.stationStake.upsert({
    where: { fanId_stationId: { fanId, stationId } },
    create: { fanId, stationId, amount },
    update: { amount },
  });

  await evaluateStationMilestones(stationId);
  return { ok: true as const, amount };
}

export async function unstakeFromStation(fanId: string, stationId: string) {
  const stake = await getStationStake(fanId, stationId);
  if (!stake) return { ok: false as const, error: "No stake found" };

  await prisma.stationStake.delete({ where: { id: stake.id } });
  await creditUser(fanId, stake.amount, "station_unstake", stationId);
  return { ok: true as const, amount: stake.amount };
}

export async function listTopStationStakers(stationId: string, limit = 5) {
  return prisma.stationStake.findMany({
    where: { stationId },
    orderBy: { amount: "desc" },
    take: limit,
    include: { fan: { select: { username: true, displayName: true, avatar: true } } },
  });
}

async function getStationMilestoneMetrics(stationId: string) {
  const [followerCount, stakeTotals, showStats] = await Promise.all([
    getStationFollowCount(stationId),
    getStationStakeTotal(stationId),
    getStationStats(stationId),
  ]);
  return {
    followers: followerCount,
    staked: stakeTotals.total,
    tips: showStats.dropEarned,
  };
}

export async function evaluateStationMilestones(stationId: string) {
  const station = await prisma.radioStation.findUnique({ where: { id: stationId } });
  if (!station) return [];

  const claimed = new Set(JSON.parse(station.milestonesClaimed || "[]") as string[]);
  const metrics = await getStationMilestoneMetrics(stationId);
  const newlyClaimed: string[] = [];

  for (const milestone of STATION_MILESTONES) {
    if (claimed.has(milestone.key)) continue;
    const value = metrics[milestone.metric];
    if (value < milestone.threshold) continue;

    const stakers = await prisma.stationStake.findMany({ where: { stationId } });
    for (const staker of stakers) {
      await creditUser(
        staker.fanId,
        milestone.rewardPerStaker,
        "station_milestone",
        stationId,
        { milestone: milestone.key, label: milestone.label },
      );
    }

    claimed.add(milestone.key);
    newlyClaimed.push(milestone.key);
  }

  if (newlyClaimed.length > 0) {
    await prisma.radioStation.update({
      where: { id: stationId },
      data: { milestonesClaimed: JSON.stringify([...claimed]) },
    });
  }

  return newlyClaimed;
}

export async function getStationMilestoneProgress(stationId: string) {
  const station = await prisma.radioStation.findUnique({ where: { id: stationId } });
  const claimed = new Set(JSON.parse(station?.milestonesClaimed || "[]") as string[]);
  const metrics = await getStationMilestoneMetrics(stationId);

  return STATION_MILESTONES.map((m) => ({
    ...m,
    current: metrics[m.metric],
    claimed: claimed.has(m.key),
    progress: Math.min(100, Math.round((metrics[m.metric] / m.threshold) * 100)),
  }));
}
