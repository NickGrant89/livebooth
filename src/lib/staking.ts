import { prisma } from "./db";
import { creditUser, debitUser } from "./ledger";
import { MIN_STAKE_AMOUNT, DJ_MILESTONES, type MemberTier } from "./constants";
import { notifyUser } from "./notifications";
import { distributeProportionalRewards } from "./staking-rewards";
import {
  chargeMembershipPayment,
  creditDjMembershipRevenue,
  isMembershipActive,
  memberTierPrice,
  nextBillingDate,
  normalizeMemberTier,
  notifyMembershipWelcome,
} from "./membership";

export async function getStake(fanId: string, djId: string) {
  return prisma.djStake.findUnique({
    where: { fanId_djId: { fanId, djId } },
  });
}

export async function getDjStakeTotal(djId: string) {
  const members = await prisma.djStake.findMany({
    where: { djId, status: "active" },
    select: { monthlyAmount: true, nextBillingAt: true, status: true },
  });
  const active = members.filter((m) => isMembershipActive(m));
  return {
    total: active.reduce((sum, m) => sum + m.monthlyAmount, 0),
    stakers: active.length,
  };
}

export async function joinDjMembership(fanId: string, djId: string, tierInput: MemberTier) {
  const tier = normalizeMemberTier(tierInput);
  const monthlyAmount = memberTierPrice(tier);
  if (fanId === djId) return { ok: false as const, error: "Cannot join your own membership" };

  const dj = await prisma.user.findUnique({
    where: { id: djId },
    select: { id: true, username: true, displayName: true },
  });
  if (!dj) return { ok: false as const, error: "DJ not found" };

  const existing = await getStake(fanId, djId);
  if (existing && isMembershipActive(existing)) {
    if (existing.tier === tier) {
      return { ok: true as const, amount: existing.monthlyAmount, tier: existing.tier as MemberTier };
    }
    const upgradeCost = Math.max(0, monthlyAmount - existing.monthlyAmount);
    if (upgradeCost > 0) {
      const ok = await chargeMembershipPayment(fanId, upgradeCost, "membership_upgrade", djId);
      if (!ok) return { ok: false as const, error: "Insufficient DROP to upgrade" };
      await creditDjMembershipRevenue(djId, fanId, upgradeCost);
    }
    await prisma.djStake.update({
      where: { id: existing.id },
      data: {
        tier,
        monthlyAmount,
        amount: monthlyAmount,
        lifetimePaid: { increment: upgradeCost },
      },
    });
    return { ok: true as const, amount: monthlyAmount, tier };
  }

  const ok = await chargeMembershipPayment(fanId, monthlyAmount, "membership_join", djId);
  if (!ok) return { ok: false as const, error: "Insufficient DROP" };

  await creditDjMembershipRevenue(djId, fanId, monthlyAmount);

  await prisma.djStake.upsert({
    where: { fanId_djId: { fanId, djId } },
    create: {
      fanId,
      djId,
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

  try {
    await evaluateDjMilestones(djId);
  } catch (err) {
    console.error("dj milestones after membership:", err);
  }

  await notifyMembershipWelcome(
    fanId,
    dj.displayName,
    tier,
    monthlyAmount,
    `/dj/${dj.username}#membership`,
  );

  return { ok: true as const, amount: monthlyAmount, tier };
}

/** @deprecated use joinDjMembership */
export async function stakeOnDj(fanId: string, djId: string, amount: number) {
  const tier: MemberTier = amount >= memberTierPrice("supporter") ? "supporter" : "member";
  return joinDjMembership(fanId, djId, tier);
}

export async function cancelDjMembership(fanId: string, djId: string) {
  const stake = await getStake(fanId, djId);
  if (!stake || !isMembershipActive(stake)) {
    return { ok: false as const, error: "No active membership" };
  }

  await prisma.djStake.update({
    where: { id: stake.id },
    data: { status: "cancelled" },
  });
  return { ok: true as const };
}

/** @deprecated use cancelDjMembership */
export async function unstakeFromDj(fanId: string, djId: string) {
  return cancelDjMembership(fanId, djId);
}

export async function listTopStakers(djId: string, limit = 5) {
  return prisma.djStake.findMany({
    where: { djId, status: "active" },
    orderBy: [{ monthlyAmount: "desc" }, { lifetimePaid: "desc" }],
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

    const stakers = await prisma.djStake.findMany({
      where: { djId, status: "active" },
      select: { fanId: true, monthlyAmount: true },
    });
    const rewards = distributeProportionalRewards(
      stakers.map((s) => ({ fanId: s.fanId, amount: s.monthlyAmount })),
      milestone.rewardPool,
    );

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
