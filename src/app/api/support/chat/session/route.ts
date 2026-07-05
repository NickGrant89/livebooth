import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, error } from "@/lib/api-utils";
import { appendSupportMessage, serializeSupportMessage } from "@/lib/support-chat";
import { notifyAdminsSupportMessage } from "@/lib/support-notifications";
import { z } from "zod";

const startSchema = z.object({
  email: z.string().email(),
  category: z.string().min(1),
  message: z.string().min(1).max(2000),
  subject: z.string().max(120).optional(),
});

/** Start a support live chat — creates ticket + first message. */
export async function POST(request: Request) {
  const session = await getSessionUser();

  try {
    const body = startSchema.parse(await request.json());
    const categoryLabel =
      body.category.charAt(0).toUpperCase() + body.category.slice(1).replace(/_/g, " ");
    const subject = body.subject?.trim() || `Live chat: ${categoryLabel}`;
    const channelToken = crypto.randomUUID().replace(/-/g, "");

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session?.id,
        email: body.email.trim(),
        category: body.category,
        subject,
        body: body.message.trim(),
        channelToken,
        messages: {
          create: {
            senderRole: "user",
            senderId: session?.id ?? null,
            body: body.message.trim(),
          },
        },
      },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 1 },
      },
    });

    notifyAdminsSupportMessage(
      { id: ticket.id, subject: ticket.subject, email: ticket.email },
      body.message.trim(),
      { isNew: true },
    ).catch((err) => console.error("support chat start notification:", err));

    return json({
      ticketId: ticket.id,
      channelToken,
      status: ticket.status,
      subject: ticket.subject,
      messages: ticket.messages.map(serializeSupportMessage),
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Please fill all fields correctly");
    console.error("support chat start:", e);
    return error("Could not start chat", 500);
  }
}

/** Resume an open ticket for the signed-in user. */
export async function GET() {
  const session = await getSessionUser();
  if (!session) return json({ tickets: [] });

  const tickets = await prisma.supportTicket.findMany({
    where: {
      userId: session.id,
      status: { in: ["open", "in_progress"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      subject: true,
      status: true,
      category: true,
      updatedAt: true,
      channelToken: true,
    },
  });

  return json({
    tickets: tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      category: t.category,
      updatedAt: t.updatedAt.toISOString(),
      channelToken: t.channelToken,
    })),
  });
}
