import { prisma } from "./db";
import { notifyUser } from "./notifications";
import { sendPushToUser } from "./web-push";

function preview(text: string, max = 120) {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

async function listAdminIds() {
  const admins = await prisma.user.findMany({
    where: { role: "admin", suspendedAt: null },
    select: { id: true },
  });
  return admins.map((a) => a.id);
}

/** Notify signed-in user when support replies to their ticket. */
export async function notifySupportReply(
  ticket: { id: string; userId: string | null; subject: string },
  messageBody: string,
) {
  if (!ticket.userId) return;

  const body = preview(messageBody);
  await notifyUser(
    ticket.userId,
    "support_reply",
    "Support replied",
    body,
    "/support",
  );

  sendPushToUser(ticket.userId, {
    title: "Support replied",
    body,
    url: "/support",
    tag: `support-${ticket.id}`,
  }).catch((err) => console.error("web push support reply:", err));
}

/** Notify all admins about a new or updated support ticket from a user. */
export async function notifyAdminsSupportMessage(
  ticket: { id: string; subject: string; email: string },
  messageBody: string,
  opts?: { isNew?: boolean },
) {
  const adminIds = await listAdminIds();
  if (adminIds.length === 0) return;

  const title = opts?.isNew ? "New support chat" : "Support message";
  const body = `${ticket.email}: ${preview(messageBody, 100)}`;

  await prisma.notification.createMany({
    data: adminIds.map((userId) => ({
      userId,
      type: "support_message",
      title,
      body,
      href: "/admin",
    })),
  });

  await Promise.all(
    adminIds.map((userId) =>
      sendPushToUser(userId, {
        title,
        body,
        url: "/admin",
        tag: `support-in-${ticket.id}`,
      }).catch((err) => console.error("web push support admin:", err)),
    ),
  );
}
