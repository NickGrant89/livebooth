import { prisma } from "@/lib/db";
import { json, error, isApiError } from "@/lib/api-utils";
import { requireStaffApi, logAdminAction } from "@/lib/admin";
import { forceEndStream, evaluateAllLiveStreams } from "@/lib/moderation";
import { z } from "zod";

export async function GET(request: Request) {
  const staff = await requireStaffApi(request);
  if (isApiError(staff)) return staff;

  await evaluateAllLiveStreams();

  const streams = await prisma.stream.findMany({
    where: { status: "live" },
    include: {
      dj: { select: { username: true, displayName: true, avatar: true } },
      station: { select: { slug: true, name: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  return json({
    streams: streams.map((s) => ({
      id: s.id,
      title: s.title,
      genre: s.genre,
      peakViewers: s.peakViewers,
      totalTips: s.totalTips,
      reportCount: s.reportCount,
      moderationStatus: s.moderationStatus,
      moderationReason: s.moderationReason,
      startedAt: s.startedAt?.toISOString(),
      playbackUrl: s.playbackUrl,
      promotionTier: s.promotionTier,
      promotedUntil: s.promotedUntil?.toISOString() ?? null,
      promotionDropAmount: s.promotionDropAmount,
      dj: s.dj,
      station: s.station,
    })),
  });
}

const stopSchema = z.object({
  streamId: z.string(),
  reason: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  const staff = await requireStaffApi(request);
  if (isApiError(staff)) return staff;

  try {
    const body = stopSchema.parse(await request.json());
    const stream = await forceEndStream(body.streamId, `Admin: ${body.reason}`, "terminated");
    if (!stream) return error("Stream not live or not found", 404);
    await logAdminAction(staff.id, "stream_stop", body.streamId, { reason: body.reason }, request);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    return error("Failed to stop stream", 500);
  }
}
