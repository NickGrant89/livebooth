import { json, error, isApiError } from "@/lib/api-utils";
import { requireStaffApi, logAdminAction } from "@/lib/admin";
import { getModerationQueue } from "@/lib/moderation";
import {
  getRecentAiScans,
  getAiModerationProvider,
  isAiModerationConfigured,
  runAiModerationScan,
  scanLiveStreamsDue,
} from "@/lib/ai-moderation";
import { prisma } from "@/lib/db";
import {
  AI_MODERATION_RISK_FLAG,
  AI_MODERATION_RISK_STOP,
  AI_MODERATION_SCAN_INTERVAL_MS,
} from "@/lib/constants";

export async function GET(request: Request) {
  const staff = await requireStaffApi(request);
  if (isApiError(staff)) return staff;

  const [queue, recentReports, chatMessageReports, aiScans] = await Promise.all([
    getModerationQueue(),
    prisma.streamReport.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      include: {
        stream: {
          select: { title: true, status: true, dj: { select: { username: true } } },
        },
        reporter: { select: { username: true } },
      },
    }),
    prisma.chatMessageReport.findMany({
      where: { status: "pending" },
      take: 30,
      orderBy: { createdAt: "desc" },
      include: {
        message: { select: { message: true, username: true } },
        stream: {
          select: { title: true, dj: { select: { username: true } } },
        },
        reporter: { select: { username: true } },
      },
    }),
    getRecentAiScans(25),
  ]);

  return json({
    ai: {
      configured: isAiModerationConfigured(),
      provider: getAiModerationProvider(),
      stopThreshold: AI_MODERATION_RISK_STOP,
      flagThreshold: AI_MODERATION_RISK_FLAG,
      scanIntervalMs: AI_MODERATION_SCAN_INTERVAL_MS,
    },
    flagged: queue.map((s) => ({
      id: s.id,
      title: s.title,
      reportCount: s.reportCount,
      moderationStatus: s.moderationStatus,
      moderationReason: s.moderationReason,
      aiRiskScore: s.aiRiskScore,
      aiLastScanAt: s.aiLastScanAt?.toISOString(),
      dj: s.dj,
      reports: s.reports.map((r) => ({
        reason: r.reason,
        details: r.details,
        reporter: r.reporter.username,
        createdAt: r.createdAt.toISOString(),
      })),
    })),
    aiScans: aiScans.map((scan) => ({
      id: scan.id,
      provider: scan.provider,
      riskScore: scan.riskScore,
      flags: JSON.parse(scan.flags || "[]") as string[],
      action: scan.action,
      mediaUrl: scan.mediaUrl,
      createdAt: scan.createdAt.toISOString(),
      streamTitle: scan.stream.title,
      streamStatus: scan.stream.status,
      djUsername: scan.stream.dj.username,
    })),
    recentReports: recentReports.map((r) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      createdAt: r.createdAt.toISOString(),
      streamTitle: r.stream.title,
      streamStatus: r.stream.status,
      djUsername: r.stream.dj.username,
      reporter: r.reporter.username,
    })),
    chatMessageReports: chatMessageReports.map((r) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      messagePreview: r.message.message.slice(0, 120),
      messageAuthor: r.message.username,
      streamTitle: r.stream.title,
      djUsername: r.stream.dj.username,
      reporter: r.reporter.username,
    })),
  });
}

export async function POST(request: Request) {
  const staff = await requireStaffApi(request);
  if (isApiError(staff)) return staff;

  const body = await request.json().catch(() => ({}));
  if (body.action === "clear_flag" && body.streamId) {
    await prisma.stream.update({
      where: { id: body.streamId },
      data: { moderationStatus: "ok", moderationReason: null },
    });
    await logAdminAction(staff.id, "clear_flag", body.streamId, undefined, request);
    return json({ ok: true });
  }

  if (body.action === "scan_all") {
    const results = await scanLiveStreamsDue();
    await logAdminAction(staff.id, "ai_scan_all", "live_streams", { count: results.length }, request);
    return json({ ok: true, scanned: results.length, results });
  }

  if (body.action === "scan_stream" && body.streamId) {
    const result = await runAiModerationScan(body.streamId);
    await logAdminAction(staff.id, "ai_scan", body.streamId, undefined, request);
    return json({ ok: true, result });
  }

  if (body.action === "dismiss_chat_report" && body.reportId) {
    await prisma.chatMessageReport.update({
      where: { id: body.reportId },
      data: { status: "dismissed" },
    });
    await logAdminAction(staff.id, "dismiss_chat_report", body.reportId, undefined, request);
    return json({ ok: true });
  }

  return error("Unknown action", 400);
}
