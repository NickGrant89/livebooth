import { prisma } from "@/lib/db";
import { json, error } from "@/lib/api-utils";
import { isVodPlaybackUrl } from "@/lib/playback-url";
import {
  getStreamReplayState,
  resolveEndedStreamPlaybackUrl,
} from "@/lib/vod-recording";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const stream = await prisma.stream.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      ingestKey: true,
      vodUrl: true,
      playbackUrl: true,
      endedAt: true,
    },
  });

  if (!stream || stream.status !== "ended") {
    return error("Replay not found", 404);
  }

  let playbackUrl: string | null = stream.vodUrl ?? stream.playbackUrl;
  if (stream.ingestKey) {
    const resolved = await resolveEndedStreamPlaybackUrl(stream.ingestKey, playbackUrl);
    if (resolved) {
      playbackUrl = resolved;
      if (stream.vodUrl !== resolved) {
        await prisma.stream.update({
          where: { id: stream.id },
          data: { vodUrl: resolved },
        });
      }
    }
  }

  if (playbackUrl && !isVodPlaybackUrl(playbackUrl)) {
    playbackUrl = null;
  }

  const replayState = await getStreamReplayState(
    stream.ingestKey,
    stream.endedAt,
    playbackUrl ?? stream.vodUrl,
    stream.playbackUrl,
  );

  return json({
    playbackUrl: playbackUrl ?? "",
    replayState,
    ready: replayState === "ready" && Boolean(playbackUrl),
    processing: replayState === "processing",
  });
}
