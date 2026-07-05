import { prisma } from "@/lib/db";
import { json, error, isApiError } from "@/lib/api-utils";
import { requireAdminApi, logAdminAction } from "@/lib/admin";
import { appendSupportMessage, serializeSupportMessage } from "@/lib/support-chat";
import { notifyAdminsSupportMessage, notifySupportReply } from "@/lib/support-notifications";
import { z } from "zod";

const schema = z.object({
  ticketId: z.string(),
  body: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const body = schema.parse(await request.json());
    const ticket = await prisma.supportTicket.findUnique({ where: { id: body.ticketId } });
    if (!ticket) return error("Ticket not found", 404);

    const message = await appendSupportMessage(body.ticketId, "admin", body.body, admin.id);
    await logAdminAction(admin.id, "support_reply", body.ticketId, { preview: body.body.slice(0, 80) }, request);

    notifySupportReply(ticket, body.body).catch((err) =>
      console.error("support reply notification:", err),
    );

    return json({ message: serializeSupportMessage(message) });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid message");
    console.error("admin support reply:", e);
    return error("Could not send reply", 500);
  }
}
