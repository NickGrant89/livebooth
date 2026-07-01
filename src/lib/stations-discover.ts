import { prisma } from "./db";
import { getLiveStreamForStation, getNextScheduledResident, getTierMeta } from "./stations";
import { DAY_LABELS } from "./constants";

export type UpcomingStationShow = {
  stationSlug: string;
  stationName: string;
  stationAvatar: string;
  showTitle: string;
  djUsername: string;
  djDisplayName: string;
  djAvatar: string;
  slotDay: number;
  slotHour: number;
  slotLabel: string | null;
  minutesUntil: number;
};

export type PublicStationCard = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  avatar: string;
  tier: string;
  tierLabel: string;
  followerCount: number;
  residentCount: number;
  isLive: boolean;
  liveDjUsername: string | null;
  liveTitle: string | null;
  nextShow: {
    showTitle: string;
    djUsername: string;
    slotLabel: string | null;
    slotDay: number;
    slotHour: number;
  } | null;
};

function minutesUntilSlot(slotDay: number, slotHour: number): number {
  const now = new Date();
  const nowMinutes = now.getUTCDay() * 24 * 60 + now.getUTCHours() * 60 + now.getUTCMinutes();
  let slotMinutes = slotDay * 24 * 60 + slotHour * 60;
  let diff = slotMinutes - nowMinutes;
  if (diff <= 0) diff += 7 * 24 * 60;
  return diff;
}

/** Upcoming resident slots across all stations (for home "Starting soon"). */
export async function fetchUpcomingStationShows(limit = 8): Promise<UpcomingStationShow[]> {
  const residents = await prisma.stationResident.findMany({
    where: { slotDay: { not: null }, slotHour: { not: null } },
    include: {
      station: { select: { slug: true, name: true, avatar: true } },
      dj: { select: { username: true, displayName: true, avatar: true } },
    },
  });

  const upcoming: UpcomingStationShow[] = [];
  for (const r of residents) {
    if (r.slotDay == null || r.slotHour == null) continue;
    upcoming.push({
      stationSlug: r.station.slug,
      stationName: r.station.name,
      stationAvatar: r.station.avatar,
      showTitle: r.showTitle || r.dj.displayName,
      djUsername: r.dj.username,
      djDisplayName: r.dj.displayName,
      djAvatar: r.dj.avatar,
      slotDay: r.slotDay,
      slotHour: r.slotHour,
      slotLabel: r.slotLabel,
      minutesUntil: minutesUntilSlot(r.slotDay, r.slotHour),
    });
  }

  return upcoming.sort((a, b) => a.minutesUntil - b.minutesUntil).slice(0, limit);
}

export function formatSlotLabel(slotDay: number, slotHour: number, slotLabel: string | null) {
  if (slotLabel) return slotLabel;
  return `${DAY_LABELS[slotDay]} ${slotHour}:00 UTC`;
}

/** Public station list for /residencies and home radio row. */
export async function fetchPublicStations(limit = 24): Promise<PublicStationCard[]> {
  const stations = await prisma.radioStation.findMany({
    include: {
      residents: {
        include: {
          dj: { select: { username: true, displayName: true, avatar: true } },
        },
        orderBy: [{ slotDay: "asc" }, { slotHour: "asc" }],
      },
      _count: { select: { follows: true, residents: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const cards: PublicStationCard[] = [];
  for (const s of stations) {
    const live = await getLiveStreamForStation(s.id);
    const next = getNextScheduledResident(s.residents);
    const tierMeta = getTierMeta(s.tier);
    cards.push({
      id: s.id,
      slug: s.slug,
      name: s.name,
      tagline: s.tagline,
      avatar: s.avatar,
      tier: s.tier,
      tierLabel: tierMeta.label,
      followerCount: s._count.follows,
      residentCount: s._count.residents,
      isLive: Boolean(live),
      liveDjUsername: live?.dj.username ?? null,
      liveTitle: live?.title ?? null,
      nextShow: next
        ? {
            showTitle: next.showTitle || next.dj.displayName,
            djUsername: next.dj.username,
            slotLabel: next.slotLabel,
            slotDay: next.slotDay!,
            slotHour: next.slotHour!,
          }
        : null,
    });
  }

  return cards.sort((a, b) => {
    if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
    return b.followerCount - a.followerCount;
  });
}

/** Station owner DROP from resident show tips (ledger type station_tip). */
export async function getStationOwnerEarnings(ownerId: string) {
  const agg = await prisma.ledgerEntry.aggregate({
    where: { userId: ownerId, type: "station_tip" },
    _sum: { amount: true },
    _count: true,
  });
  return { total: agg._sum.amount ?? 0, tipCount: agg._count };
}
