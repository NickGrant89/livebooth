import { prisma } from "./db";
import { broadcastChatMessageWithProfile } from "./chat-profiles";
import {
  PLATFORM_FEE_TIP,
  PLATFORM_FEE_UNLOCK,
  PLATFORM_FEE_REQUEST,
  HIGHLIGHT_TIP_MIN,
  STATION_TIP_DJ_SHARE,
  STATION_TIP_STATION_SHARE,
  STATION_TIP_PLATFORM_SHARE,
} from "./constants";
import { applyFirstTipBonus, createStreamHighlight } from "./retention";
import { getStakerBadgeForStream } from "./staker-perks";
import { evaluateDjMilestones } from "./staking";
import { evaluateStationMilestones } from "./station-staking";
import { fanPaymentCountsAsCreatorEarnings } from "./withdrawable-earnings";

export async function getOrCreateBalance(userId: string) {
  let balance = await prisma.beatBalance.findUnique({ where: { userId } });
  if (!balance) {
    balance = await prisma.beatBalance.create({
      data: { userId, balance: 500, totalEarned: 0 },
    });
  }
  return balance;
}

export async function creditUser(
  userId: string,
  amount: number,
  type: string,
  reference?: string,
  metadata?: Record<string, unknown>,
  opts?: { countAsEarned?: boolean },
) {
  const countAsEarned = opts?.countAsEarned ?? true;
  await getOrCreateBalance(userId);
  await prisma.$transaction([
    prisma.beatBalance.update({
      where: { userId },
      data: {
        balance: { increment: amount },
        ...(countAsEarned ? { totalEarned: { increment: amount } } : {}),
      },
    }),
    prisma.ledgerEntry.create({
      data: {
        userId,
        amount,
        type,
        reference,
        metadata: JSON.stringify(metadata ?? {}),
      },
    }),
  ]);
}

export async function debitUser(
  userId: string,
  amount: number,
  type: string,
  reference?: string,
  metadata?: Record<string, unknown>,
): Promise<boolean> {
  const bal = await getOrCreateBalance(userId);
  if (bal.balance < amount) return false;

  await prisma.$transaction([
    prisma.beatBalance.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    }),
    prisma.ledgerEntry.create({
      data: {
        userId,
        amount: -amount,
        type,
        reference,
        metadata: JSON.stringify(metadata ?? {}),
      },
    }),
  ]);
  return true;
}

export async function processTip(
  fromUserId: string,
  toUserId: string,
  streamId: string,
  amount: number,
  message?: string,
  timestampMs?: number,
) {
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { stationId: true },
  });

  const collab = await prisma.streamCollab.findUnique({
    where: { streamId },
  });

  const useStationSplit =
    stream?.stationId && collab?.status !== "active";

  const platformFee = useStationSplit
    ? amount * STATION_TIP_PLATFORM_SHARE
    : amount * PLATFORM_FEE_TIP;
  const djAmount = useStationSplit
    ? amount * STATION_TIP_DJ_SHARE
    : amount - platformFee;
  const stationAmount = useStationSplit ? amount * STATION_TIP_STATION_SHARE : 0;

  const ok = await debitUser(fromUserId, amount, "tip_sent", streamId, {
    toUserId,
    stationId: stream?.stationId,
  });
  if (!ok) return null;

  const countsAsEarned = await fanPaymentCountsAsCreatorEarnings(fromUserId);

  if (collab?.status === "active") {
    const partnerShare = djAmount * collab.splitRatio;
    const hostShare = djAmount - partnerShare;
    await creditUser(toUserId, hostShare, "tip_received", streamId, {
      fromUserId,
      platformFee,
      collabSplit: collab.splitRatio,
    }, { countAsEarned: countsAsEarned });
    await creditUser(collab.partnerDjId, partnerShare, "tip_received", streamId, {
      fromUserId,
      collabPartner: true,
    }, { countAsEarned: countsAsEarned });
  } else if (useStationSplit && stream?.stationId) {
    const station = await prisma.radioStation.findUnique({
      where: { id: stream.stationId },
      select: { ownerId: true },
    });
    await creditUser(toUserId, djAmount, "tip_received", streamId, {
      fromUserId,
      platformFee,
      stationSplit: STATION_TIP_STATION_SHARE,
    }, { countAsEarned: countsAsEarned });
    if (station) {
      await creditUser(station.ownerId, stationAmount, "station_tip", streamId, {
        fromUserId,
        residentDjId: toUserId,
      }, { countAsEarned: countsAsEarned });
    }
  } else {
    await creditUser(toUserId, djAmount, "tip_received", streamId, {
      fromUserId,
      platformFee,
    }, { countAsEarned: countsAsEarned });
  }

  const tip = await prisma.tip.create({
    data: {
      streamId,
      fromUserId,
      toUserId,
      amount,
      platformFee,
      message,
      timestampMs,
    },
  });

  const fromUser = await prisma.user.findUnique({
    where: { id: fromUserId },
    select: { username: true },
  });

  await prisma.stream.update({
    where: { id: streamId },
    data: { totalTips: { increment: amount } },
  });

  const tipCount = await prisma.tip.count({ where: { streamId } });
  if (tipCount === 1) {
    await applyFirstTipBonus(streamId, toUserId);
  }

  if (timestampMs != null && amount >= HIGHLIGHT_TIP_MIN) {
    await createStreamHighlight(
      streamId,
      tip.id,
      timestampMs,
      amount,
      fromUser?.username ?? "fan",
    );
  }

  const chatMsg = await prisma.chatMessage.create({
    data: {
      streamId,
      userId: fromUserId,
      username: fromUser?.username ?? "fan",
      message: message ?? `tipped ${amount} DROP 💎`,
      isTip: true,
      tipAmount: amount,
    },
  });

  const stakerBadge = await getStakerBadgeForStream(fromUserId, {
    djId: toUserId,
    stationId: stream?.stationId ?? null,
  });
  await broadcastChatMessageWithProfile(streamId, chatMsg, stakerBadge);

  try {
    await evaluateDjMilestones(toUserId);
    if (stream?.stationId) {
      await evaluateStationMilestones(stream.stationId);
    }
  } catch (err) {
    console.error("milestones after tip:", err);
  }

  return tip;
}

export async function processTrackUnlock(
  userId: string,
  streamId: string,
  djId: string,
  trackTitle: string,
  trackArtist: string,
  amount: number,
) {
  const platformFee = amount * PLATFORM_FEE_UNLOCK;
  const djAmount = amount - platformFee;

  const ok = await debitUser(userId, amount, "track_unlock", streamId);
  if (!ok) return null;

  const countsAsEarned = await fanPaymentCountsAsCreatorEarnings(userId);
  await creditUser(djId, djAmount, "track_unlock_earned", streamId, undefined, {
    countAsEarned: countsAsEarned,
  });

  const priorUnlocks = await prisma.trackUnlock.count({ where: { streamId } });

  return prisma.trackUnlock.create({
    data: {
      streamId,
      userId,
      trackTitle,
      trackArtist,
      amount,
      platformFee,
      isFirstUnlock: priorUnlocks === 0,
    },
  });
}

export async function processCrowdRequest(
  fanId: string,
  streamId: string,
  trackTitle: string,
  trackArtist: string | undefined,
  amount: number,
) {
  const ok = await debitUser(fanId, amount, "request_escrow", streamId);
  if (!ok) return null;

  return prisma.crowdRequest.create({
    data: {
      streamId,
      fanId,
      trackTitle,
      trackArtist,
      amount,
      platformFee: 0,
      status: "pending",
    },
  });
}

export async function resolveCrowdRequest(
  requestId: string,
  djId: string,
  accept: boolean,
) {
  const request = await prisma.crowdRequest.findUnique({
    where: { id: requestId },
    include: { stream: true },
  });
  if (!request || request.status !== "pending") return null;
  if (request.stream.djId !== djId) return null;

  if (accept) {
    const platformFee = request.amount * PLATFORM_FEE_REQUEST;
    const djAmount = request.amount - platformFee;
    const countsAsEarned = await fanPaymentCountsAsCreatorEarnings(request.fanId);
    await creditUser(djId, djAmount, "request_earned", requestId, undefined, {
      countAsEarned: countsAsEarned,
    });
    return prisma.crowdRequest.update({
      where: { id: requestId },
      data: { status: "accepted", platformFee },
    });
  }

  const refund = request.amount - 1;
  await creditUser(request.fanId, refund, "request_refund", requestId);
  return prisma.crowdRequest.update({
    where: { id: requestId },
    data: { status: "declined" },
  });
}

export async function buyDrop(userId: string, amount: number, source: "dev" | "stripe" = "dev") {
  await creditUser(
    userId,
    amount,
    source === "stripe" ? "stripe_purchase" : "purchase",
    undefined,
    { simulated: source === "dev" },
    { countAsEarned: false },
  );
  return getOrCreateBalance(userId);
}

export async function buyDropFromStripe(
  userId: string,
  dropAmount: number,
  stripeSessionId: string,
  amountCents: number,
) {
  const existing = await prisma.stripePurchase.findUnique({
    where: { stripeSessionId },
  });
  if (existing?.status === "completed") {
    return getOrCreateBalance(userId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.stripePurchase.upsert({
      where: { stripeSessionId },
      create: {
        userId,
        stripeSessionId,
        dropAmount,
        amountCents,
        status: "completed",
        completedAt: new Date(),
      },
      update: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    await getOrCreateBalance(userId);
    await tx.beatBalance.update({
      where: { userId },
      data: {
        balance: { increment: dropAmount },
      },
    });
    await tx.ledgerEntry.create({
      data: {
        userId,
        amount: dropAmount,
        type: "stripe_purchase",
        reference: stripeSessionId,
        metadata: JSON.stringify({ amountCents, stripeSessionId }),
      },
    });
  });

  return getOrCreateBalance(userId);
}

export async function claimAchievementReward(userId: string, achievementId: string) {
  const ua = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId } },
    include: { achievement: true },
  });
  if (!ua?.unlockedAt || ua.claimedAt) return null;

  await creditUser(
    userId,
    ua.achievement.rewardTokens,
    "achievement_claim",
    achievementId,
  );

  return prisma.userAchievement.update({
    where: { id: ua.id },
    data: { claimedAt: new Date(), claimTxHash: `internal-${Date.now()}` },
  });
}
