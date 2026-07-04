import {
  getIngestModeForStream,
  getRtmpIngestUrl,
  publishStreamSession,
  resolveLivePlaybackUrl,
} from "@/lib/streaming";
import { notifyStationFollowersChannelGoLive } from "@/lib/notifications";
import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { z } from "zod";

const schema = z.object({
  streamId: z.string().min(1),
});

function serializeChannelStream(stream: {
  id: string;
  ingestKey: string | null;
  playbackUrl: string | null;
  title: string;
  status?: string;
}) {
  return {
    id: stream.id,
    ingestKey: stream.ingestKey,
    rtmpUrl: getRtmpIngestUrl(stream.ingestKey),
    playbackUrl: resolveLivePlaybackUrl(
      stream.status ?? "live",
      stream.ingestKey,
      stream.playbackUrl,
    ),
    title: stream.title,
    status: stream.status ?? "live",
    ingestMode: getIngestModeForStream(stream.ingestKey, stream.playbackUrl),
  };
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (auth.role !== "station" && auth.role !== "admin") {
    return error("Station accounts only", 403);
  }

  try {
    const body = schema.parse(await request.json());
    const existing = await prisma.stream.findFirst({
      where: {
        id: body.streamId,
        djId: auth.id,
        stationChannel: true,
      },
    });
    if (!existing) return error("Stream not found", 404);
    if (existing.status === "live") {
      return json({ stream: serializeChannelStream(existing), alreadyPublished: true });
    }
    if (existing.status !== "preparing") {
      return error("Stream is not in preview", 400);
    }

    const stream = await publishStreamSession(body.streamId, auth.id);
    if (!stream) return error("Could not publish stream", 400);

    if (stream.stationId) {
      await notifyStationFollowersChannelGoLive(stream.stationId, stream.title);
    }

    return json({ stream: serializeChannelStream(stream), alreadyPublished: false });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    console.error("station go-live publish:", e);
    return error("Failed to publish station channel", 500);
  }
}
