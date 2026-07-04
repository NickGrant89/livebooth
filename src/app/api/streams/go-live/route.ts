import { getSessionUser } from "@/lib/auth";
import { createStreamSession, endStreamSession, cancelStreamPreview, getRtmpIngestUrl, getIngestModeForStream, resolveLivePlaybackUrl } from "@/lib/streaming";
import { evaluateAchievements } from "@/lib/achievements";
import { updateDjStreak, buildStreamRecap } from "@/lib/retention";
import { computeSetScore } from "@/lib/set-score";
import { getStationForDj } from "@/lib/stations";
import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  genre: z.string(),
  bpmRange: z.string().optional(),
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
  const user = auth;

  if (user.role !== "dj" && user.role !== "admin") {
    return error("Only creators can go live. Sign up with the Creator role.", 403);
  }

  const existing = await prisma.stream.findFirst({
    where: { djId: user.id, status: { in: ["preparing", "live"] } },
  });
  if (existing) {
    return json({ stream: serializeGoLiveStream(existing), alreadyLive: true });
  }

  try {
    const body = schema.parse(await request.json());
    const station = await getStationForDj(user.id);
    const stream = await createStreamSession(
      user.id,
      body.title,
      body.genre,
      body.bpmRange,
      station?.id,
    );

    return json({ stream: serializeGoLiveStream(stream), alreadyLive: false });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid stream details");
    console.error("go-live:", e);
    return error("Failed to start stream", 500);
  }
}

export async function DELETE() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;
  const user = auth;

  const stream = await prisma.stream.findFirst({
    where: { djId: user.id, status: { in: ["preparing", "live"] } },
  });
  if (!stream) return error("No live stream", 404);

  if (stream.status === "preparing") {
    await cancelStreamPreview(stream.id, user.id);
    return json({ ok: true, cancelled: true });
  }

  await endStreamSession(stream.id, user.id);
  await updateDjStreak(user.id);
  await computeSetScore(stream.id);
  const recap = await buildStreamRecap(stream.id);
  await evaluateAchievements(user.id);

  return json({ ok: true, recap, streamId: stream.id });
}
