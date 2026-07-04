import {
  cancelStreamPreview,
  createStationChannelSession,
  endStreamSession,
  getIngestModeForStream,
  getRtmpIngestUrl,
  publishStreamSession,
  resolveLivePlaybackUrl,
} from "@/lib/streaming";
import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { getActiveStationChannelForOwner } from "@/lib/stations";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  genre: z.string().default("mixed"),
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
      stream.status ?? "preparing",
      stream.ingestKey,
      stream.playbackUrl,
    ),
    title: stream.title,
    status: stream.status ?? "preparing",
    ingestMode: getIngestModeForStream(stream.ingestKey, stream.playbackUrl),
  };
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (auth.role !== "station" && auth.role !== "admin") {
    return error("Station accounts only", 403);
  }

  const station = await prisma.radioStation.findUnique({ where: { ownerId: auth.id } });
  if (!station) return error("Create your station in Settings first", 404);

  const existing = await getActiveStationChannelForOwner(auth.id);
  if (existing) {
    return json({ stream: serializeChannelStream(existing), alreadyLive: true });
  }

  try {
    const body = schema.parse(await request.json());
    const stream = await createStationChannelSession(
      auth.id,
      station.id,
      body.title,
      body.genre,
    );
    return json({ stream: serializeChannelStream(stream), alreadyLive: false });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid stream details");
    console.error("station go-live:", e);
    return error("Failed to start station channel", 500);
  }
}

export async function DELETE() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const stream = await getActiveStationChannelForOwner(auth.id);
  if (!stream) return error("No active station channel", 404);

  if (stream.status === "preparing") {
    await cancelStreamPreview(stream.id, auth.id);
    return json({ ok: true, cancelled: true });
  }

  await endStreamSession(stream.id, auth.id);
  return json({ ok: true, streamId: stream.id });
}

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const stream = await getActiveStationChannelForOwner(auth.id);
  if (!stream) return json({ stream: null });
  return json({ stream: serializeChannelStream(stream) });
}
