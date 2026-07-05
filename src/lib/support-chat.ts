import { prisma } from "./db";
import type { SupportMessagePayload } from "./support-chat-types";

export type { SupportMessagePayload } from "./support-chat-types";

export function serializeSupportMessage(m: {
  id: string;
  senderRole: string;
  body: string;
  createdAt: Date;
}): SupportMessagePayload {
  return {
    id: m.id,
    senderRole: m.senderRole as "user" | "admin",
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  };
}

export async function getTicketForAccess(
  ticketId: string,
  opts: { userId?: string | null; channelToken?: string | null },
) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      userId: true,
      email: true,
      category: true,
      subject: true,
      status: true,
      channelToken: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!ticket) return null;

  if (opts.userId && ticket.userId === opts.userId) return ticket;
  if (opts.channelToken && ticket.channelToken === opts.channelToken) return ticket;

  return null;
}

export async function appendSupportMessage(
  ticketId: string,
  senderRole: "user" | "admin",
  body: string,
  senderId?: string | null,
) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message cannot be empty");

  const [message] = await prisma.$transaction([
    prisma.supportTicketMessage.create({
      data: {
        ticketId,
        senderRole,
        senderId: senderId ?? null,
        body: trimmed.slice(0, 2000),
      },
    }),
    prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        updatedAt: new Date(),
        ...(senderRole === "user" ? { body: trimmed.slice(0, 2000) } : {}),
        ...(senderRole === "user" ? { status: "open" } : { status: "in_progress" }),
      },
    }),
  ]);

  return message;
}
