import { prisma } from "./db";

export interface LeaderboardEntry {
  rank: number;
  username: string;
  displayName: string;
  avatar: string;
  value: number;
  valueLabel: string;
  isLive?: boolean;
  href: string;
  meta?: string;
}

function rankEntries<T extends { value: number }>(
  items: T[],
  valueLabel: string,
): (T & { rank: number; valueLabel: string })[] {
  return items
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)
    .map((item, i) => ({ ...item, rank: i + 1, valueLabel }));
}

export async function getLeaderboardData() {
  const djs = await prisma.user.findMany({
    where: { role: { in: ["dj", "admin"] } },
    include: {
      balance: true,
      streams: {
        where: { status: "live" },
        take: 1,
        select: { id: true },
      },
      _count: { select: { followers: true } },
    },
  });

  const djIds = djs.map((d) => d.id);

  const [tipsReceived, tipsSent, peakByDj, stationRows] = await Promise.all([
    djIds.length
      ? prisma.tip.groupBy({
          by: ["toUserId"],
          where: { toUserId: { in: djIds } },
          _sum: { amount: true },
        })
      : [],
    prisma.tip.groupBy({
      by: ["fromUserId"],
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 20,
    }),
    djIds.length
      ? prisma.stream.groupBy({
          by: ["djId"],
          where: { djId: { in: djIds } },
          _max: { peakViewers: true },
        })
      : [],
    prisma.radioStation.findMany({
      include: {
        _count: { select: { follows: true, stakes: true } },
        streams: { select: { totalTips: true, peakViewers: true } },
      },
    }),
  ]);

  const tipsReceivedMap = new Map(
    tipsReceived.map((t) => [t.toUserId, t._sum.amount ?? 0]),
  );
  const peakMap = new Map(peakByDj.map((p) => [p.djId, p._max.peakViewers ?? 0]));

  const djBase = (dj: (typeof djs)[0]) => ({
    username: dj.username,
    displayName: dj.displayName,
    avatar: dj.avatar,
    isLive: dj.streams.length > 0,
    href: `/dj/${dj.username}`,
  });

  const byEarned = rankEntries(
    djs.map((dj) => ({
      ...djBase(dj),
      value: Math.round(dj.balance?.totalEarned ?? 0),
      meta: `${dj._count.followers} followers`,
    })),
    "DROP earned",
  );

  const byFollowers = rankEntries(
    djs.map((dj) => ({
      ...djBase(dj),
      value: dj._count.followers,
      meta: `${Math.round(dj.balance?.totalEarned ?? 0)} DROP earned`,
    })),
    "followers",
  );

  const byTips = rankEntries(
    djs
      .map((dj) => ({
        ...djBase(dj),
        value: Math.round(tipsReceivedMap.get(dj.id) ?? 0),
        meta: `${dj._count.followers} followers`,
      }))
      .filter((d) => d.value > 0),
    "DROP tipped",
  );

  const byViewers = rankEntries(
    djs.map((dj) => ({
      ...djBase(dj),
      value: peakMap.get(dj.id) ?? 0,
      meta: "peak viewers",
    })),
    "peak viewers",
  );

  const fanIds = tipsSent.map((t) => t.fromUserId);
  const fanUsers =
    fanIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: fanIds } },
          select: { id: true, username: true, displayName: true, avatar: true },
        })
      : [];
  const fanMap = new Map(fanUsers.map((f) => [f.id, f]));

  const topFans = rankEntries(
    tipsSent
      .map((t) => {
        const fan = fanMap.get(t.fromUserId);
        if (!fan) return null;
        return {
          username: fan.username,
          displayName: fan.displayName,
          avatar: fan.avatar,
          value: Math.round(t._sum.amount ?? 0),
          href: `/dj/${fan.username}`,
          meta: "lifetime tips",
        };
      })
      .filter(Boolean) as Omit<LeaderboardEntry, "rank" | "valueLabel">[],
    "DROP tipped",
  ).map((f) => ({
    ...f,
    href: `/wallet`,
  }));

  const topStations = rankEntries(
    stationRows.map((s) => ({
      username: s.slug,
      displayName: s.name,
      avatar: s.avatar,
      value: Math.round(s.streams.reduce((sum, st) => sum + st.totalTips, 0)),
      href: `/station/${s.slug}`,
      meta: `${s._count.follows} followers · ${s._count.stakes} stakers`,
    })),
    "DROP on shows",
  );

  const topStationsByFollowers = rankEntries(
    stationRows.map((s) => ({
      username: s.slug,
      displayName: s.name,
      avatar: s.avatar,
      value: s._count.follows,
      href: `/station/${s.slug}`,
      meta: `${s._count.stakes} stakers`,
    })),
    "followers",
  );

  const topSets = await prisma.stream.findMany({
    where: { status: "ended", setScore: { not: null } },
    orderBy: { setScore: "desc" },
    take: 20,
    include: {
      dj: { select: { username: true, displayName: true, avatar: true } },
    },
  });

  const bySetScore = rankEntries(
    topSets.map((s) => ({
      username: s.dj.username,
      displayName: s.dj.displayName,
      avatar: s.dj.avatar,
      value: Math.round(s.setScore ?? 0),
      href: `/vod/${s.id}`,
      meta: `${s.setGrade ?? "?"} · ${s.title}`,
    })),
    "set pts",
  );

  const liveCount = djs.filter((d) => d.streams.length > 0).length;

  return {
    summary: {
      liveDjs: liveCount,
      totalDjs: djs.length,
      totalStations: stationRows.length,
      topSetGrade: topSets[0]?.setGrade ?? null,
    },
    djs: {
      earned: byEarned,
      followers: byFollowers,
      tips: byTips,
      viewers: byViewers,
    },
    fans: { tippers: topFans },
    stations: {
      earned: topStations,
      followers: topStationsByFollowers,
    },
    sets: bySetScore,
  };
}
