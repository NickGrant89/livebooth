import { prisma } from "./db";
import {
  rankForDiscover,
  getTodayGenreNight,
  getHeroLabel,
  isGridPromoted,
  type DiscoverLiveStream,
} from "./discover-ranking";
import { attachLikeCounts } from "./stream-likes";

export async function fetchDiscoverLiveStreams(genre?: string) {
  const [streams, flagships] = await Promise.all([
    prisma.stream.findMany({
      where: {
        status: "live",
        ...(genre ? { genre } : {}),
      },
      include: {
        dj: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
      orderBy: { startedAt: "desc" },
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

  let liveStreams: Array<DiscoverLiveStream & { playbackUrl: string | null }> = streams.map((s) => ({
    id: s.id,
    title: s.title,
    genre: s.genre,
    viewers: s.peakViewers,
    sessionTips: Math.round(s.totalTips),
    bpmRange: s.bpmRange,
    startedAt: s.startedAt,
    promotionTier: s.promotionTier,
    promotedUntil: s.promotedUntil,
    playbackUrl: s.playbackUrl,
    djUserId: s.dj.id,
    dj: {
      username: s.dj.username,
      displayName: s.dj.displayName,
      avatar: s.dj.avatar,
    },
  }));

  liveStreams = rankForDiscover(liveStreams, {
    genreNightGenre: genreNight?.genre,
    flagshipDjIds,
  });

  const withLikes = await attachLikeCounts(liveStreams);

  return withLikes.map((s) => ({
    ...s,
    startedAt: s.startedAt?.toISOString() ?? null,
    promotedUntil: s.promotedUntil?.toISOString() ?? null,
    heroLabel: getHeroLabel(s),
    gridPromoted: isGridPromoted(s),
  }));
}
