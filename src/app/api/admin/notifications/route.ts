import { json, error, isApiError } from "@/lib/api-utils";
import { requireAdminApi, logAdminAction } from "@/lib/admin";
import { clearAllNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  const [total, unread] = await Promise.all([
    prisma.notification.count(),
    prisma.notification.count({ where: { read: false } }),
  ]);

  return json({ total, unread });
}

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const deleted = await clearAllNotifications();
    await logAdminAction(admin.id, "notifications_clear_all", "all_users", { deleted }, request);
    return json({ ok: true, deleted });
  } catch (e) {
    console.error("admin notifications clear:", e);
    return error("Clear failed", 500);
  }
}
