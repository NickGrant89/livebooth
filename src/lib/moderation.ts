import { prisma } from "./db";
import { notifyUser } from "./notifications";
import { isDemoPlayback } from "./streaming";
import { resolveRecordingVodUrlWithRetry } from "./vod-recording";
import {
  STREAM_REPORT_AUTO_STOP,
  STREAM_REPORT_WINDOW_MS,
  STREAM_DEMO_MAX_MINUTES,
} from "./constants";
import { runAiModerationScan, scanLiveStreamsDue } from "./ai-moderation";

export async function forceEndStream(
  streamId: string,
  reason: string,
  status: "terminated" | "auto_stopped" = "terminated",
) {
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    include: { dj: { select: { id: true, displayName: true } } },
  });
  if (!stream || stream.status !== "live") return null;

  let vodUrl: string | null = null;
  if (stream.ingestKey) {
    vodUrl = await resolveRecordingVodUrlWithRetry(stream.ingestKey);
  }

  const updated = await prisma.stream.update({
    where: { id: streamId },
    data: {
      status: "ended",
      endedAt: new Date(),
      moderationStatus: status,
      moderationReason: reason,
      vodUrl,
    },
  });

  await notifyUser(
    stream.djId,
    "stream_stopped",
    "Stream ended by moderation",
    reason,
    "/dashboard",
  );

  return updated;
}

export async function reportStream(
  streamId: string,
  reporterId: string,
  reason: string,
  details?: string,
) {
  const stream = await prisma.stream.findUnique({ where: { id: streamId } });
  if (!stream || stream.status !== "live") {
    return { ok: false as const, error: "Stream is not live" };
  }
  if (stream.djId === reporterId) {
    return { ok: false as const, error: "Cannot report your own stream" };
  }

  try {
    await prisma.streamReport.create({
      data: { streamId, reporterId, reason, details },
    });
  } catch {
    return { ok: false as const, error: "You already reported this stream" };
  }

  const reportCount = await prisma.streamReport.count({ where: { streamId } });
  await prisma.stream.update({
    where: { id: streamId },
    data: {
      reportCount,
      moderationStatus: reportCount >= 2 ? "flagged" : "ok",
    },
  });

  const recentReports = await prisma.streamReport.count({
    where: {
      streamId,
      createdAt: { gte: new Date(Date.now() - STREAM_REPORT_WINDOW_MS) },
    },
  });

  let autoStopped = false;
  if (recentReports >= STREAM_REPORT_AUTO_STOP) {
    await forceEndStream(
      streamId,
      `Automatically stopped after ${recentReports} viewer reports in 15 minutes`,
      "auto_stopped",
    );
    autoStopped = true;
  } else {
    await checkDemoStreamTimeout(streamId);
    await runAiModerationScan(streamId);
  }

  return { ok: true as const, autoStopped, reportCount };
}

export async function checkDemoStreamTimeout(streamId: string) {
  const stream = await prisma.stream.findUnique({ where: { id: streamId } });
  if (!stream || stream.status !== "live" || !stream.startedAt) return false;
  if (!isDemoPlayback(stream.playbackUrl)) return false;

  const minutes = (Date.now() - stream.startedAt.getTime()) / 60000;
  if (minutes < STREAM_DEMO_MAX_MINUTES) return false;

  await forceEndStream(
    streamId,
    `No valid encoder signal for ${Math.floor(minutes)} minutes — stream auto-stopped`,
    "auto_stopped",
  );
  return true;
}

export async function evaluateAllLiveStreams() {
  const live = await prisma.stream.findMany({
    where: { status: "live" },
    select: { id: true },
  });
  let stopped = 0;
  for (const s of live) {
    const did = await checkDemoStreamTimeout(s.id);
    if (did) stopped += 1;
  }
  await scanLiveStreamsDue();
  return stopped;
}

export async function getModerationQueue() {
  return prisma.stream.findMany({
    where: {
      OR: [
        { status: "live", moderationStatus: { not: "ok" } },
        { reportCount: { gt: 0 }, status: "live" },
      ],
    },
    include: {
      dj: { select: { username: true, displayName: true, avatar: true } },
      reports: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { reporter: { select: { username: true } } },
      },
    },
    orderBy: { reportCount: "desc" },
  });
}
