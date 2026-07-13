import { prisma } from "./db";
import {
  MIN_STAKE_AMOUNT,
  STAKER_TIER_CORE_MIN,
  STAKER_TIER_LEGEND_MIN,
  STAKER_TIP_GRADE_BOOST,
  STAKER_UNLOCK_DISCOUNT,
  STAKER_REQUEST_DISCOUNT,
  STAKER_VOD_EARLY_HOURS,
  DJ_STAKER_VOD_EARLY_HOURS,
  TRACK_UNLOCK_COST,
  REQUEST_COST,
} from "./constants";
import type { ChatMessagePayload } from "./chat-hub";
import { attachChatProfiles } from "./chat-profiles";

export type StakerTier = "member" | "core" | "legend";

export type StakerPerksSnapshot = {
  isStationStaker: boolean;
  isDjStaker: boolean;
  stationStakeAmount: number;
  djStakeAmount: number;
  tier: StakerTier | null;
  badgeLabel: string | null;
};

export function tierFromStakeAmount(amount: number): StakerTier | null {
  if (amount < MIN_STAKE_AMOUNT) return null;
  if (amount >= STAKER_TIER_LEGEND_MIN) return "legend";
  if (amount >= STAKER_TIER_CORE_MIN) return "core";
  return "member";
}

export function badgeLabelForTier(tier: StakerTier | null): string | null {
  if (!tier) return null;
  if (tier === "legend") return "Legend";
  if (tier === "core") return "Core";
  return "Member";
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

  const stationStakeAmount = stationStake?.amount ?? 0;
  const djStakeAmount = djStake?.amount ?? 0;
  const tier = tierFromStakeAmount(Math.max(stationStakeAmount, djStakeAmount));

  return {
    isStationStaker: stationStakeAmount >= MIN_STAKE_AMOUNT,
    isDjStaker: djStakeAmount >= MIN_STAKE_AMOUNT,
    stationStakeAmount,
    djStakeAmount,
    tier,
    badgeLabel: badgeLabelForTier(tier),
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

  const stationMap = new Map(stationStakes.map((s) => [s.fanId, s.amount]));
  const djMap = new Map(djStakes.map((s) => [s.fanId, s.amount]));

  return withProfiles.map((msg) => {
    if (!msg.userId) return msg;
    const stationAmt = stream.stationId ? (stationMap.get(msg.userId) ?? 0) : 0;
    const djAmt = djMap.get(msg.userId) ?? 0;
    const tier = tierFromStakeAmount(Math.max(stationAmt, djAmt));
    const stakerBadge =
      (stream.stationId && stationAmt >= MIN_STAKE_AMOUNT) || djAmt >= MIN_STAKE_AMOUNT
        ? badgeLabelForTier(tier)
        : null;
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
  const stationMember = Boolean(stationId && perks.isStationStaker);
  const perkEligible = stationMember || perks.isDjStaker;

  const baseUnlock = vip ? Math.ceil(TRACK_UNLOCK_COST * 0.7) : TRACK_UNLOCK_COST;
  const baseRequest = vip ? Math.ceil(REQUEST_COST * 0.7) : REQUEST_COST;

  return {
    vip,
    staker: perkEligible,
    stakerTier: perks.tier,
    stakerBadge: perks.badgeLabel,
    stationMember,
    djStaker: perks.isDjStaker,
    trackUnlockCost: perkEligible
      ? applyStakerDiscount(baseUnlock, STAKER_UNLOCK_DISCOUNT)
      : baseUnlock,
    requestCost: perkEligible
      ? applyStakerDiscount(baseRequest, STAKER_REQUEST_DISCOUNT)
      : baseRequest,
    tipGradeBoost: perkEligible ? STAKER_TIP_GRADE_BOOST : 1,
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
          where: { stationId },
          select: { fanId: true },
        })
      : Promise.resolve([]),
    prisma.djStake.findMany({
      where: { djId },
      select: { fanId: true },
    }),
  ]);

  if (tips.length === 0) return fallbackTotal;

  const stakerIds = new Set([
    ...stationStakers.map((s) => s.fanId),
    ...djStakers.map((s) => s.fanId),
  ]);
  let total = 0;
  for (const tip of tips) {
    total += stakerIds.has(tip.fromUserId) ? tip.amount * STAKER_TIP_GRADE_BOOST : tip.amount;
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
