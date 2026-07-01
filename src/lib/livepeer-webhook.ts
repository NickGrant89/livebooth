import { prisma } from "./db";

type LivepeerWebhook = {
  id?: string;
  event?: string;
  stream?: {
    id?: string;
    name?: string;
    record?: boolean;
  };
  recording?: {
    url?: string;
    mp4Url?: string;
    hlsUrl?: string;
  };
  session?: {
    recordingUrl?: string;
  };
};

/** Resolve VOD URL from Livepeer webhook payload. */
export function extractRecordingUrl(payload: LivepeerWebhook): string | null {
  return (
    payload.recording?.mp4Url ??
    payload.recording?.hlsUrl ??
    payload.recording?.url ??
    payload.session?.recordingUrl ??
    null
  );
}

/**
 * Apply recording URL to the matching stream.
 * Matches by providerStreamId (Livepeer stream id) or ingestKey when present in payload.
 */
export async function applyLivepeerRecording(payload: LivepeerWebhook) {
  const vodUrl = extractRecordingUrl(payload);
  if (!vodUrl) return { updated: false, reason: "no_recording_url" as const };

  const providerStreamId = payload.stream?.id;
  if (!providerStreamId) return { updated: false, reason: "no_stream_id" as const };

  const stream = await prisma.stream.findFirst({
    where: { providerStreamId },
    orderBy: { startedAt: "desc" },
  });

  if (!stream) return { updated: false, reason: "stream_not_found" as const };

  await prisma.stream.update({
    where: { id: stream.id },
    data: {
      vodUrl,
      ...(stream.status === "live" ? { status: "ended", endedAt: new Date() } : {}),
    },
  });

  return { updated: true, streamId: stream.id, vodUrl };
}
