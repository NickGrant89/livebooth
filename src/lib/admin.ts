import { NextResponse } from "next/server";
import { prisma } from "./db";
import { error } from "./api-utils";
import { getSessionUser, type SessionUser } from "./auth";
import { enforceRateLimit, getClientIp } from "./rate-limit";
import { isSupportTicketUnread } from "./support-ticket-unread";
import {
  isStaffRole,
  isFullAdminRole,
  type StaffRole,
  STAFF_ROLES,
  MODERATOR_TAB_IDS,
} from "./staff-roles";

const ADMIN_API_LIMIT = 120;
const ADMIN_API_WINDOW_MS = 60 * 1000;

export {
  STAFF_ROLES,
  MODERATOR_TAB_IDS,
  isStaffRole,
  isFullAdminRole,
  isProtectedStaffTarget,
  type StaffRole,
} from "./staff-roles";

export async function requireStaff(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || !isStaffRole(user.role)) return null;
  return user;
}

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || !isFullAdminRole(user.role)) return null;
  return user;
}

async function rateLimitStaff(request: Request): Promise<NextResponse | null> {
  return enforceRateLimit(request, "admin-api", ADMIN_API_LIMIT, ADMIN_API_WINDOW_MS);
}

export async function requireStaffApi(
  request: Request,
): Promise<SessionUser | NextResponse> {
  const limited = await rateLimitStaff(request);
  if (limited) return limited;

  const staff = await requireStaff();
  if (!staff) return error("Staff access required", 403);
  return staff;
}

export async function requireAdminApi(
  request: Request,
): Promise<SessionUser | NextResponse> {
  const limited = await rateLimitStaff(request);
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

export type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;

export function getModeratorStats(stats: AdminStats) {
  return {
    liveStreams: stats.liveStreams,
    openTickets: stats.openTickets,
    unreadSupport: stats.unreadSupport,
    flaggedStreams: stats.flaggedStreams,
    reportsToday: stats.reportsToday,
  };
}
