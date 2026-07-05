import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, error } from "@/lib/api-utils";
import {
  appendSupportMessage,
  getTicketForAccess,
  serializeSupportMessage,
} from "@/lib/support-chat";
import { notifyAdminsSupportMessage } from "@/lib/support-notifications";
import { z } from "zod";

const messageSchema = z.object({
  body: z.string().min(1).max(2000),
  channelToken: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await params;
  const session = await getSessionUser();
  const channelToken =
    request.headers.get("x-support-token") ??
    new URL(request.url).searchParams.get("token");

  const ticket = await getTicketForAccess(ticketId, {
    userId: session?.id,
    channelToken,
  });
  if (!ticket) return error("Ticket not found", 404);

  const since = new URL(request.url).searchParams.get("since");
  const messages = await prisma.supportTicketMessage.findMany({
    where: {
      ticketId,
      ...(since ? { createdAt: { gt: new Date(since) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: since ? 50 : 100,
  });

  return json({
    ticket: {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      category: ticket.category,
      email: ticket.email,
    },
    messages: messages.map(serializeSupportMessage),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await params;
  const session = await getSessionUser();

  try {
    const body = messageSchema.parse(await request.json());
    const ticket = await getTicketForAccess(ticketId, {
      userId: session?.id,
      channelToken: body.channelToken,
    });
    if (!ticket) return error("Ticket not found", 404);
    if (ticket.status === "resolved") {
      return error("This ticket is closed — start a new chat", 400);
    }

    const message = await appendSupportMessage(
      ticketId,
      "user",
      body.body,
      session?.id,
    );

    notifyAdminsSupportMessage(
      { id: ticket.id, subject: ticket.subject, email: ticket.email },
      body.body,
    ).catch((err) => console.error("support user message notification:", err));

    return json({ message: serializeSupportMessage(message) });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid message");
    console.error("support chat message:", e);
    return error("Could not send message", 500);
  }
}
