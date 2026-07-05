import { prisma } from "./db";
import { attachLikeCounts } from "./stream-likes";

export type ForYouLiveStream = {
  id: string;
  title: string;
  genre: string;
  viewers: number;
  sessionTips: number;
  dj: { username: string; displayName: string; avatar: string };
};

/** Live booths from DJs the fan follows — auth required. */
export async function fetchForYouLiveStreams(userId: string): Promise<ForYouLiveStream[]> {
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  if (follows.length === 0) return [];

  const djIds = follows.map((f) => f.followingId);
  const streams = await prisma.stream.findMany({
    where: { djId: { in: djIds }, status: "live" },
    include: {
      dj: { select: { username: true, displayName: true, avatar: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  return attachLikeCounts(
    streams.map((s) => ({
      id: s.id,
      title: s.title,
      genre: s.genre,
      viewers: s.peakViewers,
      sessionTips: Math.round(s.totalTips),
      dj: s.dj,
    })),
  );
}
