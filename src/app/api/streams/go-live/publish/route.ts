import { publishStreamSession, getRtmpIngestUrl, getIngestModeForStream, resolveLivePlaybackUrl } from "@/lib/streaming";
import { tryActivateCollabCompositor } from "@/lib/collab-compositor";
import { isLiveKitConfigured } from "@/lib/livekit";
import { evaluateAchievements } from "@/lib/achievements";
import {
  notifyFollowersGoLive,
  notifyDjShareReminder,
  notifyStationFollowersResidentGoLive,
} from "@/lib/notifications";
import { updateDjStreak } from "@/lib/retention";
import { getStationForDj } from "@/lib/stations";
import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { z } from "zod";

const schema = z.object({
  streamId: z.string().min(1),
});

function serializeGoLiveStream(stream: {
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

  if (auth.role !== "dj" && auth.role !== "admin") {
    return error("Only creators can go live.", 403);
  }

  try {
    const body = schema.parse(await request.json());
    const existing = await prisma.stream.findFirst({
      where: { id: body.streamId, djId: auth.id },
    });
    if (!existing) return error("Stream not found", 404);
    if (existing.status === "live") {
      return json({ stream: serializeGoLiveStream(existing), alreadyPublished: true });
    }
    if (existing.status !== "preparing") {
      return error("Stream is not in preview", 400);
    }

    const stream = await publishStreamSession(body.streamId, auth.id);
    if (!stream) return error("Could not publish stream", 400);

    const hostCollab = await prisma.streamCollab.findUnique({
      where: { streamId: stream.id },
    });
    const compositor =
      hostCollab?.status === "active" && !isLiveKitConfigured()
        ? await tryActivateCollabCompositor(hostCollab.id)
        : null;

    const dj = await prisma.user.findUnique({ where: { id: auth.id } });
    const station = await getStationForDj(auth.id);
    if (dj) {
      await notifyFollowersGoLive(auth.id, dj.displayName, dj.username, stream.title);
      if (station?.id) {
        await notifyStationFollowersResidentGoLive(
          station.id,
          dj.displayName,
          dj.username,
          stream.title,
        );
      }
      await notifyDjShareReminder(auth.id, dj.username, stream.title);
      await updateDjStreak(auth.id);
      await evaluateAchievements(auth.id);
    }

    return json({ stream: serializeGoLiveStream(stream), alreadyPublished: false, compositor });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    console.error("go-live publish:", e);
    return error("Failed to publish stream", 500);
  }
}
