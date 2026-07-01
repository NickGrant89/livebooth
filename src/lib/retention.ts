import { prisma } from "./db";
import { creditUser } from "./ledger";
import { DAILY_LOGIN_DROP, FIRST_TIP_BONUS } from "./constants";

export function isoWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

export async function updateDjStreak(djId: string) {
  const week = isoWeekKey();
  const user = await prisma.user.findUnique({ where: { id: djId } });
  if (!user) return 0;

  let streak = user.streamStreak;
  if (user.lastStreamWeek === week) return streak;

  const lastWeekNum = user.lastStreamWeek
    ? parseInt(user.lastStreamWeek.split("-W")[1] ?? "0", 10)
    : 0;
  const year = parseInt(week.split("-W")[0] ?? "0", 10);
  const lastYear = user.lastStreamWeek
    ? parseInt(user.lastStreamWeek.split("-W")[0] ?? "0", 10)
    : 0;
  const currentWeekNum = parseInt(week.split("-W")[1] ?? "0", 10);

  const consecutive =
    user.lastStreamWeek &&
    ((year === lastYear && currentWeekNum === lastWeekNum + 1) ||
      (year === lastYear + 1 && lastWeekNum >= 52 && currentWeekNum === 1));

  streak = consecutive || user.lastStreamWeek ? streak + 1 : 1;

  await prisma.user.update({
    where: { id: djId },
    data: { streamStreak: streak, lastStreamWeek: week },
  });
  return streak;
}

export async function claimDailyLogin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false as const, error: "User not found" };

  const now = new Date();
  const todayUtc = now.toISOString().slice(0, 10);
  const lastUtc = user.lastDailyClaimAt?.toISOString().slice(0, 10);

  if (lastUtc === todayUtc) {
    return { ok: false as const, error: "Already claimed today", alreadyClaimed: true };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lastDailyClaimAt: now },
  });
  await creditUser(userId, DAILY_LOGIN_DROP, "daily_login", todayUtc);
  return { ok: true as const, amount: DAILY_LOGIN_DROP };
}

export async function applyFirstTipBonus(streamId: string, djId: string) {
  const stream = await prisma.stream.findUnique({ where: { id: streamId } });
  if (!stream || stream.firstTipBonusGiven) return false;

  await prisma.stream.update({
    where: { id: streamId },
    data: { firstTipBonusGiven: true },
  });
  await creditUser(djId, FIRST_TIP_BONUS, "first_tip_bonus", streamId);
  return true;
}

export async function buildStreamRecap(streamId: string) {
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    include: {
      dj: { select: { displayName: true, username: true, streamStreak: true } },
      tips: { include: { fromUser: { select: { displayName: true, username: true } } } },
      trackUnlocks: true,
      crowdRequests: true,
      highlights: true,
    },
  });
  if (!stream) return null;

  const durationMin =
    stream.startedAt && stream.endedAt
      ? Math.round((stream.endedAt.getTime() - stream.startedAt.getTime()) / 60000)
      : 0;

  const topTippers = Object.values(
    stream.tips.reduce<Record<string, { name: string; total: number }>>((acc, t) => {
      const key = t.fromUserId;
      if (!acc[key]) acc[key] = { name: t.fromUser.displayName, total: 0 };
      acc[key].total += t.amount;
      return acc;
    }, {}),
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const questContributions = await prisma.fanQuestProgress.count({
    where: { claimedStreamId: streamId, claimedAt: { not: null } },
  });

  const recap = {
    streamId: stream.id,
    title: stream.title,
    genre: stream.genre,
    djName: stream.dj.displayName,
    djUsername: stream.dj.username,
    streak: stream.dj.streamStreak,
    peakViewers: stream.peakViewers,
    totalTips: stream.totalTips,
    durationMin,
    tipCount: stream.tips.length,
    unlockCount: stream.trackUnlocks.length,
    requestsAccepted: stream.crowdRequests.filter((r) => r.status === "accepted").length,
    setScore: stream.setScore,
    setGrade: stream.setGrade,
    questContributions,
    topTippers,
    highlights: stream.highlights.map((h) => ({
      timestampMs: h.timestampMs,
      amount: h.amount,
      username: h.username,
      label: h.label,
    })),
  };

  await prisma.stream.update({
    where: { id: streamId },
    data: { recapJson: JSON.stringify(recap) },
  });

  return recap;
}

export async function createStreamHighlight(
  streamId: string,
  tipId: string,
  timestampMs: number,
  amount: number,
  username: string,
) {
  return prisma.streamHighlight.create({
    data: {
      streamId,
      tipId,
      timestampMs,
      amount,
      username,
      label: "Legendary moment",
    },
  });
}
