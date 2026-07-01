import { prisma } from "@/lib/db";
import { json, error } from "@/lib/api-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ streamId: string }> },
) {
  const { streamId } = await params;

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    include: {
      tips: { include: { fromUser: { select: { displayName: true, username: true, avatar: true } } } },
      highlights: { orderBy: { timestampMs: "asc" } },
    },
  });
  if (!stream) return error("Not found", 404);

  const topTippers = Object.values(
    stream.tips.reduce<
      Record<string, { displayName: string; username: string; avatar: string; total: number }>
    >((acc, t) => {
      const key = t.fromUserId;
      if (!acc[key]) {
        acc[key] = {
          displayName: t.fromUser.displayName,
          username: t.fromUser.username,
          avatar: t.fromUser.avatar,
          total: 0,
        };
      }
      acc[key].total += t.amount;
      return acc;
    }, {}),
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  let recap = null;
  if (stream.recapJson) {
    try {
      recap = JSON.parse(stream.recapJson);
    } catch {
      recap = null;
    }
  }

  return json({
    streamId,
    status: stream.status,
    totalTips: stream.totalTips,
    peakViewers: stream.peakViewers,
    topTippers,
    highlights: stream.highlights.map((h) => ({
      id: h.id,
      timestampMs: h.timestampMs,
      amount: h.amount,
      username: h.username,
      label: h.label,
    })),
    recap,
  });
}
