import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, error } from "@/lib/api-utils";
import { notifyAdminsSupportMessage } from "@/lib/support-notifications";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  category: z.string().min(1),
  subject: z.string().min(1).max(120),
  body: z.string().min(10).max(2000),
});

export async function POST(request: Request) {
  const session = await getSessionUser();

  try {
    const body = schema.parse(await request.json());
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session?.id,
        email: body.email,
        category: body.category,
        subject: body.subject,
        body: body.body,
        channelToken: crypto.randomUUID().replace(/-/g, ""),
        messages: {
          create: {
            senderRole: "user",
            senderId: session?.id ?? null,
            body: body.body,
          },
        },
      },
    });

    notifyAdminsSupportMessage(
      { id: ticket.id, subject: ticket.subject, email: ticket.email },
      body.body,
      { isNew: true },
    ).catch((err) => console.error("support ticket notification:", err));

    return json({ ok: true, ticketId: ticket.id });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Please fill all fields correctly");
    console.error("support ticket:", e);
    return error("Could not submit ticket", 500);
  }
}
