import { NextResponse } from "next/server";
import { prisma } from "./db";
import { error } from "./api-utils";
import { getSessionUser, type SessionUser } from "./auth";
import { enforceRateLimit, getClientIp } from "./rate-limit";
import { isSupportTicketUnread } from "./support-ticket-unread";

const ADMIN_API_LIMIT = 120;
const ADMIN_API_WINDOW_MS = 60 * 1000;

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function requireAdminApi(
  request: Request,
): Promise<SessionUser | NextResponse> {
  const limited = enforceRateLimit(request, "admin-api", ADMIN_API_LIMIT, ADMIN_API_WINDOW_MS);
  if (limited) return limited;

  const admin = await requireAdmin();
  if (!admin) return error("Admin access required", 403);
  return admin;
}

export async function logAdminAction(
  adminId: string,
  action: string,
  target: string,
  metadata?: Record<string, unknown>,
  request?: Request,
) {
  const ipAddress = request ? getClientIp(request) : null;
  const payload = metadata ?? {};

  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        target,
        metadata: JSON.stringify(payload),
        ipAddress,
      },
    });
  } catch (e) {
    console.error("[admin-audit] failed to persist:", e);
  }

  console.info("[admin]", { adminId, action, target, ipAddress, ...payload });
}

export async function getAdminStats() {
  const now = new Date();
  const [users, liveStreams, openTickets, unreadCandidates, flaggedStreams, reportsToday, stations, activePromotions] =
    await Promise.all([
      prisma.user.count(),
      prisma.stream.count({ where: { status: "live" } }),
      prisma.supportTicket.count({ where: { status: { in: ["open", "in_progress"] } } }),
      prisma.supportTicket.findMany({
        where: {
          status: { in: ["open", "in_progress"] },
          lastMessageRole: "user",
        },
        select: {
          status: true,
          lastMessageRole: true,
          lastMessageAt: true,
          adminReadAt: true,
        },
      }),
      prisma.stream.count({
        where: { status: "live", moderationStatus: { not: "ok" } },
      }),
      prisma.streamReport.count({
        where: { createdAt: { gte: new Date(Date.now() - 86400000) } },
      }),
      prisma.radioStation.count(),
      prisma.stream.count({
        where: { promotionTier: { not: null }, promotedUntil: { gt: now } },
      }),
    ]);

  const unreadSupport = unreadCandidates.filter(isSupportTicketUnread).length;

  return { users, liveStreams, openTickets, unreadSupport, flaggedStreams, reportsToday, stations, activePromotions };
}
