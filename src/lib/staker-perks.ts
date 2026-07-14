import { prisma } from "./db";
import {
  MEMBER_TIER_BADGE,
  MEMBER_TIER_REQUEST_DISCOUNT,
  MEMBER_TIER_TIP_GRADE_BOOST,
  MEMBER_TIER_UNLOCK_DISCOUNT,
  STAKER_VOD_EARLY_HOURS,
  DJ_STAKER_VOD_EARLY_HOURS,
  TRACK_UNLOCK_COST,
  REQUEST_COST,
  type MemberTier,
} from "./constants";
import type { ChatMessagePayload } from "./chat-hub";
import { attachChatProfiles } from "./chat-profiles";
import { isMembershipActive } from "./membership";

export type StakerTier = MemberTier;

export type StakerPerksSnapshot = {
  isStationStaker: boolean;
  isDjStaker: boolean;
  stationStakeAmount: number;
  djStakeAmount: number;
  tier: StakerTier | null;
  badgeLabel: string | null;
  requestPriority: boolean;
};

function tierFromRecord(
  record: { tier: string; monthlyAmount: number; status: string; nextBillingAt: Date | null } | null,
): StakerTier | null {
  if (!record || !isMembershipActive(record)) return null;
  return record.tier === "supporter" ? "supporter" : "member";
}

export function badgeLabelForTier(tier: StakerTier | null): string | null {
  if (!tier) return null;
  return MEMBER_TIER_BADGE[tier];
}

/** @deprecated */
export function tierFromStakeAmount(amount: number): StakerTier | null {
  if (amount >= 75) return "supporter";
  if (amount >= 25) return "member";
  return null;
}

function pickBestTier(
  stationTier: StakerTier | null,
  djTier: StakerTier | null,
): StakerTier | null {
  if (stationTier === "supporter" || djTier === "supporter") return "supporter";
  if (stationTier || djTier) return "member";
  return null;
}

export async function getStakerPerks(
  fanId: string | null | undefined,
  opts: { djId?: string; stationId?: string | null },
): Promise<StakerPerksSnapshot> {
  const empty: StakerPerksSnapshot = {
    isStationStaker: false,
    isDjStaker: false,
    stationStakeAmount: 0,
    djStakeAmount: 0,
    tier: null,
    badgeLabel: null,
    requestPriority: false,
  };
  if (!fanId) return empty;

  const [stationStake, djStake] = await Promise.all([
    opts.stationId
      ? prisma.stationStake.findUnique({
          where: { fanId_stationId: { fanId, stationId: opts.stationId } },
        })
      : null,
    opts.djId
      ? prisma.djStake.findUnique({
          where: { fanId_djId: { fanId, djId: opts.djId } },
        })
      : null,
  ]);

  const stationActive = stationStake && isMembershipActive(stationStake);
  const djActive = djStake && isMembershipActive(djStake);
  const stationTier = tierFromRecord(stationStake);
  const djTier = tierFromRecord(djStake);
  const tier = pickBestTier(stationTier, djTier);

  return {
    isStationStaker: Boolean(stationActive),
    isDjStaker: Boolean(djActive),
    stationStakeAmount: stationActive ? stationStake!.monthlyAmount : 0,
    djStakeAmount: djActive ? djStake!.monthlyAmount : 0,
    tier,
    badgeLabel: badgeLabelForTier(tier),
    requestPriority: tier === "supporter",
  };
}

export async function getStakerBadgeForStream(
  userId: string | null | undefined,
  stream: { djId: string; stationId: string | null },
): Promise<string | null> {
  const perks = await getStakerPerks(userId, {
    djId: stream.djId,
    stationId: stream.stationId,
  });
  if (stream.stationId && perks.isStationStaker) return perks.badgeLabel;
  if (perks.isDjStaker) return perks.badgeLabel;
  return null;
}

export async function enrichChatPayloads(
  stream: { djId: string; stationId: string | null },
  messages: ChatMessagePayload[],
): Promise<ChatMessagePayload[]> {
  const withProfiles = await attachChatProfiles(messages);
  const userIds = [...new Set(withProfiles.map((m) => m.userId).filter(Boolean))] as string[];
  if (userIds.length === 0) return withProfiles;

  const [stationStakes, djStakes] = await Promise.all([
    stream.stationId
      ? prisma.stationStake.findMany({
          where: { stationId: stream.stationId, fanId: { in: userIds } },
        })
      : [],
    prisma.djStake.findMany({
      where: { djId: stream.djId, fanId: { in: userIds } },
    }),
  ]);

  const stationMap = new Map(stationStakes.map((s) => [s.fanId, s]));
  const djMap = new Map(djStakes.map((s) => [s.fanId, s]));

  return withProfiles.map((msg) => {
    if (!msg.userId) return msg;
    const stationTier = tierFromRecord(stationMap.get(msg.userId) ?? null);
    const djTier = tierFromRecord(djMap.get(msg.userId) ?? null);
    const tier = pickBestTier(stationTier, djTier);
    const stakerBadge = badgeLabelForTier(tier);
    return stakerBadge ? { ...msg, stakerBadge } : msg;
  });
}

export function applyStakerDiscount(baseCost: number, discount: number) {
  return Math.max(1, Math.ceil(baseCost * (1 - discount)));
}

export async function getFanStreamPricingWithStakerPerks(
  fanId: string,
  djId: string,
  stationId: string | null | undefined,
  vip: boolean,
) {
  const perks = await getStakerPerks(fanId, { djId, stationId });
  const stationMember = perks.isStationStaker;
  const perkEligible = stationMember || perks.isDjStaker;
  const tier = perks.tier ?? "member";

  const unlockDiscount = perkEligible ? MEMBER_TIER_UNLOCK_DISCOUNT[tier] : 0;
  const requestDiscount = perkEligible ? MEMBER_TIER_REQUEST_DISCOUNT[tier] : 0;
  const vipUnlockDiscount = vip ? 0.3 : 0;
  const vipRequestDiscount = vip ? 0.3 : 0;

  const baseUnlock = TRACK_UNLOCK_COST;
  const baseRequest = REQUEST_COST;
  const afterVipUnlock = Math.ceil(baseUnlock * (1 - vipUnlockDiscount));
  const afterVipRequest = Math.ceil(baseRequest * (1 - vipRequestDiscount));

  return {
    vip,
    staker: perkEligible,
    stakerTier: perks.tier,
    stakerBadge: perks.badgeLabel,
    stationMember,
    djStaker: perks.isDjStaker,
    requestPriority: perks.requestPriority || vip,
    trackUnlockCost: perkEligible
      ? applyStakerDiscount(afterVipUnlock, unlockDiscount)
      : afterVipUnlock,
    requestCost: perkEligible
      ? applyStakerDiscount(afterVipRequest, requestDiscount)
      : afterVipRequest,
    tipGradeBoost: perkEligible ? MEMBER_TIER_TIP_GRADE_BOOST[tier] : 1,
  };
}

export async function effectiveTipsForSetScore(
  streamId: string,
  djId: string,
  stationId: string | null,
  fallbackTotal: number,
): Promise<number> {
  const [tips, stationStakers, djStakers] = await Promise.all([
    prisma.tip.findMany({
      where: { streamId },
      select: { fromUserId: true, amount: true },
    }),
    stationId
      ? prisma.stationStake.findMany({
          where: { stationId, status: "active" },
          select: { fanId: true, tier: true },
        })
      : Promise.resolve([]),
    prisma.djStake.findMany({
      where: { djId, status: "active" },
      select: { fanId: true, tier: true },
    }),
  ]);

  if (tips.length === 0) return fallbackTotal;

  const boostFor = (fanId: string) => {
    const st = stationStakers.find((s) => s.fanId === fanId);
    const dj = djStakers.find((s) => s.fanId === fanId);
    const tier =
      st?.tier === "supporter" || dj?.tier === "supporter" ? "supporter" : st || dj ? "member" : null;
    return tier ? MEMBER_TIER_TIP_GRADE_BOOST[tier as MemberTier] : 1;
  };

  let total = 0;
  for (const tip of tips) {
    total += tip.amount * boostFor(tip.fromUserId);
  }
  return total;
}

export type VodAccessResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "early_access";
      publicAt: string;
      stationSlug: string | null;
      djUsername: string | null;
      accessType: "station" | "dj";
    };

function vodPublicAt(
  endedAt: Date,
  stationId: string | null,
): { publicAt: number; accessType: "station" | "dj" } {
  if (stationId) {
    return {
      publicAt: endedAt.getTime() + STAKER_VOD_EARLY_HOURS * 3600_000,
      accessType: "station",
    };
  }
  return {
    publicAt: endedAt.getTime() + DJ_STAKER_VOD_EARLY_HOURS * 3600_000,
    accessType: "dj",
  };
}

export async function getVodAccess(
  userId: string | null | undefined,
  stream: {
    djId: string;
    stationId: string | null;
    endedAt: Date | null;
    station?: { slug: string; ownerId: string } | null;
    dj?: { username: string } | null;
  },
  userRole?: string,
): Promise<VodAccessResult> {
  if (!stream.endedAt) return { allowed: true };

  const { publicAt, accessType } = vodPublicAt(stream.endedAt, stream.stationId);
  if (Date.now() >= publicAt) return { allowed: true };

  if (userRole === "admin") return { allowed: true };
  if (userId && userId === stream.djId) return { allowed: true };
  if (userId && stream.station?.ownerId && userId === stream.station.ownerId) return { allowed: true };

  if (userId) {
    const perks = await getStakerPerks(userId, {
      djId: stream.djId,
      stationId: stream.stationId,
    });
    if (stream.stationId && perks.isStationStaker) return { allowed: true };
    if (perks.isDjStaker) return { allowed: true };
  }

  return {
    allowed: false,
    reason: "early_access",
    publicAt: new Date(publicAt).toISOString(),
    stationSlug: stream.station?.slug ?? null,
    djUsername: stream.dj?.username ?? null,
    accessType,
  };
}
