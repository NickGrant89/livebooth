import { requireModeratorPermissionApi } from "@/lib/admin";
import { json, isApiError } from "@/lib/api-utils";
import { pruneAdminArchives } from "@/lib/archive-cleanup";
import { enrichArchiveStreams } from "@/lib/vod-recording";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await requireModeratorPermissionApi(request, "archives");
  if (isApiError(auth)) return auth;

  await pruneAdminArchives();

  const streams = await enrichArchiveStreams(
    await prisma.stream.findMany({
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
    }),
    { resolveUrls: true, resolveLimit: 25 },
  );

  return json({
    streams: streams.map((s) => ({
      ...s,
      endedAt: s.endedAt?.toISOString() ?? null,
      hasReplay: s.hasReplay,
      replayState: s.replayState,
    })),
  });
}
