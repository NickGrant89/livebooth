import { json, requireApiUser, isApiError } from "@/lib/api-utils";
import {
  getUnreadNotifications,
  getUnreadCount,
  markNotificationsRead,
} from "@/lib/notifications";

export async function GET() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const [notifications, unreadCount] = await Promise.all([
    getUnreadNotifications(auth.id),
    getUnreadCount(auth.id),
  ]);

  return json({
    unreadCount,
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const body = (await request.json()) as { ids?: string[] };
  await markNotificationsRead(auth.id, body.ids);
  return json({ ok: true });
}
