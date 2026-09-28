import { prisma } from "@/lib/db";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  exportServerClip,
  isServerClipExportAvailable,
  signClipDownloadToken,
  type ClipExportMode,
} from "@/lib/recording-clip";
import { z } from "zod";

const bodySchema = z.object({
  durationSec: z.number().int().min(5).max(90).default(30),
  mode: z.enum(["live_tail", "vod"]).default("vod"),
  startSec: z.number().min(0).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(request, "clip-export", 12, 60 * 60 * 1000);
  if (limited) return limited;

  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  if (!isServerClipExportAvailable()) {
    return error(
      "Server MP4 clips are not configured yet — set RECORDINGS_CLIP_URL on Vercel and run clip-service on the VPS",
      503,
    );
  }

  const { id } = await params;

  try {
    const body = bodySchema.parse(await request.json());
    const stream = await prisma.stream.findUnique({
      where: { id },
      select: {
        id: true,
        djId: true,
        status: true,
        ingestKey: true,
        startedAt: true,
      },
    });
    if (!stream?.ingestKey) return error("Stream not found", 404);

    const isHost = stream.djId === auth.id;
    const isStaff = auth.role === "admin" || auth.role === "moderator";

    if (body.mode === "live_tail") {
      if (stream.status !== "live") {
        return error("Live clips are only available while the stream is on air", 400);
      }
    } else if (stream.status !== "ended" && stream.status !== "live") {
      return error("Replay clips need a live or ended stream with recording", 400);
    }

    if (!isHost && !isStaff && body.mode === "live_tail" && auth.role === "fan") {
      /* fans can clip live moments */
    } else if (!isHost && !isStaff && body.mode === "vod") {
      /* any logged-in user can export vod segments */
    }

    let startSec = body.startSec;
    if (body.mode === "vod" && startSec == null) {
      startSec = 0;
    }

    const result = await exportServerClip({
      ingestKey: stream.ingestKey,
      streamId: stream.id,
      durationSec: body.durationSec,
      mode: body.mode as ClipExportMode,
      startSec,
    });

    const token = signClipDownloadToken(stream.id, result.relativePath);

    return json({
      ok: true,
      format: "mp4",
      durationSec: result.durationSec,
      mode: result.mode,
      sizeBytes: result.sizeBytes,
      filename: result.filename,
      downloadUrl: `/api/streams/${stream.id}/clip/download?path=${encodeURIComponent(result.relativePath)}&token=${token}`,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid clip request");
    const msg = e instanceof Error ? e.message : "Clip export failed";
    return error(msg, 500);
  }
}
