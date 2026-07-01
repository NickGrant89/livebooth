import { prisma } from "./db";
import {
  rankForDiscover,
  getTodayGenreNight,
  getHeroLabel,
  isGridPromoted,
  type DiscoverLiveStream,
} from "./discover-ranking";

export async function fetchDiscoverLiveStreams(genre?: string) {
  const [djs, flagships] = await Promise.all([
    prisma.user.findMany({
      where: { role: "dj" },
      include: {
        streams: { where: { status: "live" }, take: 1 },
      },
    }),
    prisma.radioStation.findMany({
      where: { flagshipDjId: { not: null } },
      select: { flagshipDjId: true },
    }),
  ]);

  const flagshipDjIds = new Set(
    flagships.map((s) => s.flagshipDjId).filter((id): id is string => Boolean(id)),
  );
  const genreNight = getTodayGenreNight();

  let liveStreams: DiscoverLiveStream[] = djs
    .filter((d) => d.streams.length > 0)
    .map((d) => ({
      id: d.streams[0].id,
      title: d.streams[0].title,
      genre: d.streams[0].genre,
      viewers: d.streams[0].peakViewers,
      sessionTips: Math.round(d.streams[0].totalTips),
      bpmRange: d.streams[0].bpmRange,
      startedAt: d.streams[0].startedAt,
      promotionTier: d.streams[0].promotionTier,
      promotedUntil: d.streams[0].promotedUntil,
      djUserId: d.id,
      dj: {
        username: d.username,
        displayName: d.displayName,
        avatar: d.avatar,
      },
    }));

  liveStreams = rankForDiscover(liveStreams, {
    genreNightGenre: genreNight?.genre,
    flagshipDjIds,
  });

  if (genre) liveStreams = liveStreams.filter((s) => s.genre === genre);

  return liveStreams.map((s) => ({
    ...s,
    startedAt: s.startedAt?.toISOString() ?? null,
    promotedUntil: s.promotedUntil?.toISOString() ?? null,
    heroLabel: getHeroLabel(s),
    gridPromoted: isGridPromoted(s),
  }));
}
