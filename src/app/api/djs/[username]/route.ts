import { prisma } from "@/lib/db";
import { json, error, serializeUser } from "@/lib/api-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      balance: true,
      streams: {
        where: { status: { in: ["live", "ended"] } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      achievements: {
        where: { unlockedAt: { not: null } },
        include: { achievement: true },
      },
      _count: { select: { followers: true, following: true } },
    },
  });

  if (!user) return error("DJ not found", 404);

  const liveStream = user.streams.find((s) => s.status === "live");

  return json({
    ...serializeUser(user),
    isLive: !!liveStream,
    liveStreamId: liveStream?.id,
    streams: user.streams.map((s) => ({
      id: s.id,
      title: s.title,
      genre: s.genre,
      status: s.status,
      peakViewers: s.peakViewers,
      totalTips: s.totalTips,
      vodUrl: s.vodUrl,
      startedAt: s.startedAt,
    })),
    achievements: user.achievements.map((ua) => ({
      ...ua.achievement,
      claimed: !!ua.claimedAt,
    })),
  });
}
