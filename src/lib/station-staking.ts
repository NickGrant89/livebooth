import { prisma } from "./db";
import { creditUser, debitUser } from "./ledger";
import { STATION_MILESTONES, type MemberTier } from "./constants";
import { getStationStats } from "./stations";
import { notifyUser } from "./notifications";
import { distributeProportionalRewards } from "./staking-rewards";
import {
  chargeMembershipPayment,
  creditStationMembershipRevenue,
  getLiveDjForStation,
  isMembershipActive,
  memberTierPrice,
  nextBillingDate,
  normalizeMemberTier,
  notifyMembershipWelcome,
} from "./membership";

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
  try {
    await evaluateStationMilestones(stationId);
  } catch (err) {
    console.error("station milestones after follow:", err);
  }
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
  const members = await prisma.stationStake.findMany({
    where: { stationId, status: "active" },
    select: { monthlyAmount: true, nextBillingAt: true, status: true },
  });
  const active = members.filter((m) => isMembershipActive(m));
  return {
    total: active.reduce((sum, m) => sum + m.monthlyAmount, 0),
    stakers: active.length,
  };
}

export async function joinStationMembership(
  fanId: string,
  stationId: string,
  tierInput: MemberTier,
) {
  const tier = normalizeMemberTier(tierInput);
  const monthlyAmount = memberTierPrice(tier);

  const station = await prisma.radioStation.findUnique({
    where: { id: stationId },
    select: { id: true, slug: true, name: true, ownerId: true },
  });
  if (!station) return { ok: false as const, error: "Station not found" };
  if (fanId === station.ownerId) {
    return { ok: false as const, error: "Cannot join your own station membership" };
  }

  const existing = await getStationStake(fanId, stationId);
  if (existing && isMembershipActive(existing)) {
    if (existing.tier === tier) {
      return { ok: true as const, amount: existing.monthlyAmount, tier: existing.tier as MemberTier };
    }
    const upgradeCost = Math.max(0, monthlyAmount - existing.monthlyAmount);
    if (upgradeCost > 0) {
      const ok = await chargeMembershipPayment(fanId, upgradeCost, "station_membership_upgrade", stationId);
      if (!ok) return { ok: false as const, error: "Insufficient DROP to upgrade" };
      const liveDjId = await getLiveDjForStation(stationId);
      await creditStationMembershipRevenue(
        stationId,
        station.ownerId,
        fanId,
        upgradeCost,
        liveDjId,
      );
    }
    await prisma.stationStake.update({
      where: { id: existing.id },
      data: { tier, monthlyAmount, amount: monthlyAmount, lifetimePaid: { increment: upgradeCost } },
    });
    return { ok: true as const, amount: monthlyAmount, tier };
  }

  const ok = await chargeMembershipPayment(fanId, monthlyAmount, "station_membership_join", stationId);
  if (!ok) return { ok: false as const, error: "Insufficient DROP" };

  const liveDjId = await getLiveDjForStation(stationId);
  await creditStationMembershipRevenue(
    stationId,
    station.ownerId,
    fanId,
    monthlyAmount,
    liveDjId,
  );

  await prisma.stationStake.upsert({
    where: { fanId_stationId: { fanId, stationId } },
    create: {
      fanId,
      stationId,
      tier,
      amount: monthlyAmount,
      monthlyAmount,
      status: "active",
      nextBillingAt: nextBillingDate(),
      lifetimePaid: monthlyAmount,
    },
    update: {
      tier,
      amount: monthlyAmount,
      monthlyAmount,
      status: "active",
      nextBillingAt: nextBillingDate(),
      lifetimePaid: { increment: monthlyAmount },
    },
  });

  await evaluateStationMilestones(stationId);

  await notifyMembershipWelcome(
    fanId,
    station.name,
    tier,
    monthlyAmount,
    `/station/${station.slug}#membership`,
  );

  return { ok: true as const, amount: monthlyAmount, tier };
}

/** @deprecated */
export async function stakeOnStation(fanId: string, stationId: string, amount: number) {
  const tier: MemberTier = amount >= memberTierPrice("supporter") ? "supporter" : "member";
  return joinStationMembership(fanId, stationId, tier);
}

export async function cancelStationMembership(fanId: string, stationId: string) {
  const stake = await getStationStake(fanId, stationId);
  if (!stake || !isMembershipActive(stake)) {
    return { ok: false as const, error: "No active membership" };
  }
  await prisma.stationStake.update({
    where: { id: stake.id },
    data: { status: "cancelled" },
  });
  return { ok: true as const };
}

/** @deprecated */
export async function unstakeFromStation(fanId: string, stationId: string) {
  return cancelStationMembership(fanId, stationId);
}

export async function listTopStationStakers(stationId: string, limit = 5) {
  return prisma.stationStake.findMany({
    where: { stationId, status: "active" },
    orderBy: [{ tier: "desc" }, { monthlyAmount: "desc" }, { lifetimePaid: "desc" }],
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

    const stakers = await prisma.stationStake.findMany({
      where: { stationId, status: "active" },
      select: { fanId: true, monthlyAmount: true },
    });
    const rewards = distributeProportionalRewards(
      stakers.map((s) => ({ fanId: s.fanId, amount: s.monthlyAmount })),
      milestone.rewardPool,
    );

    for (const [fanId, reward] of rewards) {
      await creditUser(fanId, reward, "station_milestone", stationId, {
        milestone: milestone.key,
        label: milestone.label,
      });
      await notifyUser(
        fanId,
        "station_milestone",
        `${station.name} milestone unlocked`,
        `You earned +${reward} DROP — ${milestone.label}`,
        station.slug ? `/station/${station.slug}` : undefined,
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
