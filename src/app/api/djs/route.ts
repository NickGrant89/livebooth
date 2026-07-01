import { prisma } from "@/lib/db";
import { json, serializeUser } from "@/lib/api-utils";

function parseGenres(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get("genre");
  const bpm = searchParams.get("bpm");
  const live = searchParams.get("live");
  const q = searchParams.get("q")?.trim().toLowerCase();

  const users = await prisma.user.findMany({
    where: {
      role: "dj",
      ...(live === "true"
        ? { streams: { some: { status: "live" } } }
        : {}),
      ...(q
        ? {
            OR: [
              { username: { contains: q } },
              { displayName: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      balance: true,
      streams: {
        where: { status: "live" },
        take: 1,
        include: { nowPlaying: true },
      },
      _count: { select: { followers: true } },
      achievements: {
        where: { unlockedAt: { not: null } },
        select: { achievementId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let filtered = users;
  if (genre) {
    filtered = filtered.filter((u) => parseGenres(u.genres).includes(genre));
  }
  if (bpm) {
    filtered = filtered.filter((u) =>
      u.streams.some((s) => s.bpmRange === bpm || !s.bpmRange),
    );
  }

  return json({
    djs: filtered.map((u) => ({
      ...serializeUser({ ...u, _count: { followers: u._count.followers, following: 0 } }),
      isLive: u.streams.length > 0,
      stream: u.streams[0]
        ? {
            id: u.streams[0].id,
            title: u.streams[0].title,
            genre: u.streams[0].genre,
            viewers: u.streams[0].peakViewers,
            startedAt: u.streams[0].startedAt,
          }
        : null,
      achievementIds: u.achievements.map((a) => a.achievementId),
    })),
  });
}
