import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  isVodLikelyProcessing,
  resolveRecordingDownloadRelativePath,
  suggestedRecordingDownloadFilename,
} from "@/lib/vod-recording";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const stream = await prisma.stream.findUnique({
    where: { id },
    select: {
      id: true,
      djId: true,
      status: true,
      title: true,
      ingestKey: true,
      vodUrl: true,
      playbackUrl: true,
      endedAt: true,
    },
  });
  if (!stream) return error("Not found", 404);

  const isOwner = stream.djId === auth.id;
  const isAdmin = auth.role === "admin";
  if (!isOwner && !isAdmin) return error("Only the DJ can download this recording", 403);

  if (stream.status !== "ended") {
    return error("Recording is available after you end the stream", 400);
  }

  const relativePath = await resolveRecordingDownloadRelativePath(stream.ingestKey);
  if (!relativePath) {
    const processing = isVodLikelyProcessing(
      stream.endedAt,
      stream.ingestKey,
      stream.vodUrl,
      stream.playbackUrl,
    );
    return json({ ready: false, processing });
  }

  const recordingFilename = relativePath.split("/").pop() ?? "recording.mp4";
  const filename = suggestedRecordingDownloadFilename(stream.title, recordingFilename);

  return json({
    ready: true,
    processing: false,
    filename,
    downloadUrl: `/api/streams/${stream.id}/recording/download`,
  });
}
