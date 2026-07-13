import { requireAdminApi } from "@/lib/admin";
import { json } from "@/lib/api-utils";
import { hasStreamReplay } from "@/lib/streaming";
import { pruneAdminArchives } from "@/lib/archive-cleanup";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth instanceof Response) return auth;

  await pruneAdminArchives();

  const streams = await prisma.stream.findMany({
    where: { status: "ended" },
    orderBy: { endedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      peakViewers: true,
      totalTips: true,
      vodUrl: true,
      playbackUrl: true,
      ingestKey: true,
      endedAt: true,
      dj: { select: { username: true, displayName: true } },
    },
  });

  return json({
    streams: streams.map((s) => ({
      ...s,
      endedAt: s.endedAt?.toISOString() ?? null,
      hasReplay: hasStreamReplay(s.vodUrl, s.playbackUrl),
    })),
  });
}
