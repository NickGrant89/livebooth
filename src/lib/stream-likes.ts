import { prisma } from "./db";

export async function getStreamLikeCounts(streamIds: string[]): Promise<Map<string, number>> {
  if (streamIds.length === 0) return new Map();

  const rows = await prisma.streamLike.groupBy({
    by: ["streamId"],
    where: { streamId: { in: streamIds } },
    _count: { _all: true },
  });

  return new Map(rows.map((r) => [r.streamId, r._count._all]));
}

export async function getDjTotalLikes(djId: string): Promise<number> {
  return prisma.streamLike.count({
    where: { stream: { djId } },
  });
}

export async function attachLikeCounts<T extends { id: string }>(
  streams: T[],
): Promise<(T & { likeCount: number })[]> {
  const counts = await getStreamLikeCounts(streams.map((s) => s.id));
  return streams.map((s) => ({ ...s, likeCount: counts.get(s.id) ?? 0 }));
}
