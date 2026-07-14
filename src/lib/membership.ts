import { prisma } from "./db";
import { creditUser, debitUser } from "./ledger";
import { notifyUser } from "./notifications";
import {
  MEMBER_BILLING_DAYS,
  MEMBER_DJ_CREATOR_SHARE,
  MEMBER_PLATFORM_SHARE,
  MEMBER_STATION_LIVE_DJ_SHARE,
  MEMBER_STATION_OWNER_SHARE,
  MEMBER_TIER_PRICES,
  type MemberTier,
} from "./constants";

const MS_PER_BILLING_PERIOD = MEMBER_BILLING_DAYS * 86400000;

export function memberTierPrice(tier: MemberTier): number {
  return MEMBER_TIER_PRICES[tier];
}

export function normalizeMemberTier(tier: string | undefined): MemberTier {
  return tier === "supporter" ? "supporter" : "member";
}

export function isMembershipActive(record: {
  status: string;
  nextBillingAt: Date | null;
}): boolean {
  if (record.status !== "active") return false;
  if (!record.nextBillingAt) return true;
  return record.nextBillingAt.getTime() > Date.now();
}

function nextBillingDate(from = Date.now()): Date {
  return new Date(from + MS_PER_BILLING_PERIOD);
}

export { nextBillingDate };

export async function creditDjMembershipRevenue(
  djId: string,
  fanId: string,
  monthlyAmount: number,
) {
  const creatorShare = Math.floor(monthlyAmount * MEMBER_DJ_CREATOR_SHARE);
  if (creatorShare > 0) {
    await creditUser(djId, creatorShare, "membership_earned", fanId, {
      monthlyAmount,
      share: MEMBER_DJ_CREATOR_SHARE,
    });
  }
}

export async function creditStationMembershipRevenue(
  stationId: string,
  ownerId: string,
  fanId: string,
  monthlyAmount: number,
  liveDjId?: string | null,
) {
  const ownerShare = Math.floor(monthlyAmount * MEMBER_STATION_OWNER_SHARE);
  const liveDjShare =
    liveDjId && liveDjId !== ownerId
      ? Math.floor(monthlyAmount * MEMBER_STATION_LIVE_DJ_SHARE)
      : 0;

  if (ownerShare > 0) {
    await creditUser(ownerId, ownerShare, "station_membership_earned", stationId, {
      fanId,
      monthlyAmount,
      share: MEMBER_STATION_OWNER_SHARE,
    });
  }
  if (liveDjShare > 0 && liveDjId) {
    await creditUser(liveDjId, liveDjShare, "station_membership_artist", stationId, {
      fanId,
      monthlyAmount,
      share: MEMBER_STATION_LIVE_DJ_SHARE,
    });
  }
}

export async function chargeMembershipPayment(
  fanId: string,
  monthlyAmount: number,
  ledgerType: string,
  reference: string,
): Promise<boolean> {
  return debitUser(fanId, monthlyAmount, ledgerType, reference, { monthlyAmount });
}

export async function getLiveDjForStation(stationId: string): Promise<string | null> {
  const live = await prisma.stream.findFirst({
    where: { stationId, status: "live" },
    select: { djId: true },
  });
  return live?.djId ?? null;
}

export async function getDjMemberMrr(djId: string): Promise<{ mrr: number; count: number }> {
  const members = await prisma.djStake.findMany({
    where: { djId, status: "active" },
    select: { monthlyAmount: true, nextBillingAt: true, status: true },
  });
  const active = members.filter((m) => isMembershipActive(m));
  return {
    mrr: active.reduce((sum, m) => sum + m.monthlyAmount, 0),
    count: active.length,
  };
}

export async function getStationMemberMrr(stationId: string): Promise<{ mrr: number; count: number }> {
  const members = await prisma.stationStake.findMany({
    where: { stationId, status: "active" },
    select: { monthlyAmount: true, nextBillingAt: true, status: true },
  });
  const active = members.filter((m) => isMembershipActive(m));
  return {
    mrr: active.reduce((sum, m) => sum + m.monthlyAmount, 0),
    count: active.length,
  };
}

export async function processDueMembershipBillings(limit = 200): Promise<{
  charged: number;
  cancelled: number;
  failed: number;
}> {
  const now = new Date();
  let charged = 0;
  let cancelled = 0;
  let failed = 0;

  const dueDj = await prisma.djStake.findMany({
    where: {
      status: "active",
      nextBillingAt: { lte: now },
    },
    take: limit,
    include: { dj: { select: { id: true, username: true, displayName: true } } },
  });

  for (const row of dueDj) {
    const ok = await chargeMembershipPayment(row.fanId, row.monthlyAmount, "membership_renewal", row.djId);
    if (!ok) {
      await prisma.djStake.update({
        where: { id: row.id },
        data: { status: "past_due" },
      });
      failed++;
      continue;
    }
    await creditDjMembershipRevenue(row.djId, row.fanId, row.monthlyAmount);
    await prisma.djStake.update({
      where: { id: row.id },
      data: {
        status: "active",
        nextBillingAt: nextBillingDate(),
        lifetimePaid: { increment: row.monthlyAmount },
        amount: row.monthlyAmount,
      },
    });
    charged++;
  }

  const dueStation = await prisma.stationStake.findMany({
    where: {
      status: "active",
      nextBillingAt: { lte: now },
    },
    take: Math.max(0, limit - dueDj.length),
    include: {
      station: { select: { id: true, slug: true, name: true, ownerId: true } },
    },
  });

  for (const row of dueStation) {
    const ok = await chargeMembershipPayment(
      row.fanId,
      row.monthlyAmount,
      "station_membership_renewal",
      row.stationId,
    );
    if (!ok) {
      await prisma.stationStake.update({
        where: { id: row.id },
        data: { status: "past_due" },
      });
      failed++;
      continue;
    }
    const liveDjId = await getLiveDjForStation(row.stationId);
    await creditStationMembershipRevenue(
      row.stationId,
      row.station.ownerId,
      row.fanId,
      row.monthlyAmount,
      liveDjId,
    );
    await prisma.stationStake.update({
      where: { id: row.id },
      data: {
        status: "active",
        nextBillingAt: nextBillingDate(),
        lifetimePaid: { increment: row.monthlyAmount },
        amount: row.monthlyAmount,
      },
    });
    charged++;
  }

  const cancelledDj = await prisma.djStake.updateMany({
    where: { status: "past_due", nextBillingAt: { lt: new Date(now.getTime() - 7 * 86400000) } },
    data: { status: "cancelled" },
  });
  const cancelledStation = await prisma.stationStake.updateMany({
    where: { status: "past_due", nextBillingAt: { lt: new Date(now.getTime() - 7 * 86400000) } },
    data: { status: "cancelled" },
  });
  cancelled += cancelledDj.count + cancelledStation.count;

  return { charged, cancelled, failed };
}

export async function notifyMembershipWelcome(
  fanId: string,
  targetName: string,
  tier: MemberTier,
  monthlyAmount: number,
  path: string,
) {
  await notifyUser(
    fanId,
    "membership",
    `You're now a ${tier === "supporter" ? "Supporter" : "Member"}`,
    `${monthlyAmount} DROP/mo for ${targetName}. Perks are active now.`,
    path,
  );
}
