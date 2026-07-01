import { prisma } from "./db";
import { ACHIEVEMENTS } from "./constants";

export async function ensureAchievementCatalog() {
  const count = await prisma.achievement.count();
  if (count >= ACHIEVEMENTS.length) return;

  for (const ach of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { id: ach.id },
      create: {
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        tier: ach.tier,
        rewardTokens: ach.rewardTokens,
        requirement: ach.requirement,
        category: ach.category,
        audience: ach.audience,
        metricKey: ach.metricKey,
        threshold: ach.threshold,
      },
      update: {},
    });
  }
}

export async function getUserMetrics(userId: string, audience: "dj" | "fan") {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      balance: true,
      streams: { where: { status: "ended" } },
      tipsReceived: true,
      tipsSent: true,
      trackUnlocks: true,
      crowdRequests: { where: { status: "accepted" } },
      subscriptions: { where: { status: "active" } },
      followers: true,
    },
  });
  if (!user) return {};

  const endedStreams = user.streams;
  const genres = new Set(endedStreams.map((s) => s.genre));
  const longestStream = endedStreams.reduce((max, s) => {
    if (!s.startedAt || !s.endedAt) return max;
    const mins = (s.endedAt.getTime() - s.startedAt.getTime()) / 60000;
    return Math.max(max, mins);
  }, 0);

  const liveStream = await prisma.stream.findFirst({
    where: { djId: userId, status: "live" },
    orderBy: { startedAt: "desc" },
  });
  let currentStreamMinutes = 0;
  if (liveStream?.startedAt) {
    currentStreamMinutes =
      (Date.now() - liveStream.startedAt.getTime()) / 60000;
  }

  const maxSingleTip = user.tipsReceived.reduce(
    (m, t) => Math.max(m, t.amount),
    0,
  );
  const uniqueDjsTipped = new Set(user.tipsSent.map((t) => t.toUserId)).size;
  const accountAgeDays =
    (Date.now() - user.createdAt.getTime()) / (86400000);

  const peakViewers = await prisma.stream.aggregate({
    where: { djId: userId },
    _max: { peakViewers: true },
  });

  if (audience === "dj") {
    const allStreams = await prisma.stream.findMany({
      where: { djId: userId, status: { in: ["live", "ended"] } },
    });
    const allGenres = new Set(allStreams.map((s) => s.genre));

    return {
      streams_completed: allStreams.filter((s) => s.status === "ended").length,
      longest_stream_minutes: Math.max(longestStream, currentStreamMinutes),
      genres_streamed: allGenres.size,
      peak_viewers: peakViewers._max.peakViewers ?? 0,
      total_tips_received: user.tipsReceived.reduce((s, t) => s + t.amount, 0),
      followers: user.followers.length,
      max_single_tip: maxSingleTip,
      total_earned: user.balance?.totalEarned ?? 0,
    };
  }

  return {
    tips_sent_count: user.tipsSent.length,
    tips_sent_total: user.tipsSent.reduce((s, t) => s + t.amount, 0),
    unique_djs_tipped: uniqueDjsTipped,
    watch_minutes: user.watchMinutes ?? 0,
    track_unlocks: user.trackUnlocks.length,
    requests_accepted: user.crowdRequests.length,
    active_subscriptions: user.subscriptions.length,
    account_age_days: accountAgeDays,
  };
}

export async function evaluateAchievements(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return [];

  const audience = user.role === "dj" ? "dj" : "fan";
  const metrics = await getUserMetrics(userId, audience as "dj" | "fan");
  const unlocked: Array<{ id: string; name: string; icon: string; rewardTokens: number }> = [];

  const relevant = ACHIEVEMENTS.filter((a) => a.audience === audience);

  for (const ach of relevant) {
    const value = (metrics as Record<string, number>)[ach.metricKey] ?? 0;
    const progress = Math.min(value / ach.threshold, 1);

    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId, achievementId: ach.id },
      },
    });

    if (existing) {
      if (!existing.unlockedAt && progress >= 1) {
        await prisma.userAchievement.update({
          where: { id: existing.id },
          data: { unlockedAt: new Date(), progress: 1 },
        });
        unlocked.push({
          id: ach.id,
          name: ach.name,
          icon: ach.icon,
          rewardTokens: ach.rewardTokens,
        });
      } else if (existing.progress !== progress) {
        await prisma.userAchievement.update({
          where: { id: existing.id },
          data: { progress },
        });
      }
    } else {
      const data = {
        userId,
        achievementId: ach.id,
        progress,
        unlockedAt: progress >= 1 ? new Date() : null,
      };
      await prisma.userAchievement.create({ data });
      if (progress >= 1) {
        unlocked.push({
          id: ach.id,
          name: ach.name,
          icon: ach.icon,
          rewardTokens: ach.rewardTokens,
        });
      }
    }
  }

  return unlocked;
}

export async function getAchievementsForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const audience = user?.role === "dj" ? "dj" : "fan";

  const all = await prisma.achievement.findMany({
    where: { audience },
    include: {
      userAchievements: { where: { userId } },
    },
  });

  return all.map((a) => {
    const ua = a.userAchievements[0];
    return {
      ...a,
      progress: ua?.progress ?? 0,
      unlocked: !!ua?.unlockedAt,
      claimed: !!ua?.claimedAt,
    };
  });
}
