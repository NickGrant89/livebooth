import { prisma } from "./db";
import { RADIO_TIERS, type RadioTierId } from "./constants";

export async function getStationBySlug(slug: string) {
  return prisma.radioStation.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, username: true, displayName: true } },
      flagshipDj: {
        select: { id: true, username: true, displayName: true, avatar: true },
      },
      residents: {
        include: {
          dj: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              genres: true,
            },
          },
        },
        orderBy: [{ slotDay: "asc" }, { slotHour: "asc" }],
      },
      _count: { select: { follows: true, stakes: true } },
    },
  });
}

export async function getOwnedStation(ownerId: string) {
  return prisma.radioStation.findUnique({
    where: { ownerId },
    include: {
      residents: {
        include: {
          dj: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
        orderBy: [{ slotDay: "asc" }, { slotHour: "asc" }],
      },
      flagshipDj: {
        select: { id: true, username: true, displayName: true },
      },
      _count: { select: { follows: true, stakes: true } },
    },
  });
}

export async function getStationForDj(djId: string) {
  const resident = await prisma.stationResident.findFirst({
    where: { djId },
    include: { station: true },
  });
  return resident?.station ?? null;
}

export async function getLiveStreamForStation(stationId: string) {
  return prisma.stream.findFirst({
    where: { stationId, status: "live" },
    include: {
      dj: { select: { username: true, displayName: true, avatar: true } },
      nowPlaying: true,
    },
    orderBy: { startedAt: "desc" },
  });
}

export async function getStationStats(stationId: string) {
  const streams = await prisma.stream.findMany({
    where: { stationId },
    select: { id: true, peakViewers: true, totalTips: true, status: true },
  });

  const streamIds = streams.map((s) => s.id);
  const unlockCount =
    streamIds.length > 0
      ? await prisma.trackUnlock.count({ where: { streamId: { in: streamIds } } })
      : 0;

  return {
    totalListeners: streams.reduce((sum, s) => sum + s.peakViewers, 0),
    dropEarned: streams.reduce((sum, s) => sum + s.totalTips, 0),
    tracksUnlocked: unlockCount,
    showCount: streams.filter((s) => s.status === "ended").length,
    liveCount: streams.filter((s) => s.status === "live").length,
  };
}

export function getTierMeta(tier: string) {
  const id = tier as RadioTierId;
  return RADIO_TIERS[id] ?? RADIO_TIERS.community;
}

type ResidentRow = {
  slotDay: number | null;
  slotHour: number | null;
  showTitle: string | null;
  slotLabel: string | null;
  dj: { username: string; displayName: string; avatar: string };
};

/** Next upcoming resident slot (UTC weekday/hour). */
export function getNextScheduledResident(residents: ResidentRow[]) {
  const now = new Date();
  const nowMinutes = now.getUTCDay() * 24 * 60 + now.getUTCHours() * 60 + now.getUTCMinutes();

  let best: { resident: ResidentRow; minutesUntil: number } | null = null;

  for (const r of residents) {
    if (r.slotDay == null || r.slotHour == null) continue;
    let slotMinutes = r.slotDay * 24 * 60 + r.slotHour * 60;
    let diff = slotMinutes - nowMinutes;
    if (diff <= 0) diff += 7 * 24 * 60;
    if (!best || diff < best.minutesUntil) {
      best = { resident: r, minutesUntil: diff };
    }
  }

  return best?.resident ?? null;
}

export async function getLiveResidentUsernames(stationId: string, djIds: string[]) {
  if (djIds.length === 0) return new Set<string>();
  const live = await prisma.stream.findMany({
    where: { status: "live", djId: { in: djIds } },
    select: { dj: { select: { username: true } } },
  });
  return new Set(live.map((s) => s.dj.username));
}
