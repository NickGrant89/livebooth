import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  reason: z.string().min(1).max(64).default("spam"),
  details: z.string().max(500).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const limited = enforceRateLimit(request, "chat-report", 10, 60 * 60 * 1000);
  if (limited) return limited;

  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const { messageId } = await params;

  try {
    const body = schema.parse(await request.json());

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { stream: { select: { djId: true, status: true } } },
    });
    if (!message) return error("Message not found", 404);
    if (message.userId === auth.id) return error("Cannot report your own message", 400);
    if (message.userId === message.stream.djId) return error("Cannot report the host", 400);

    await prisma.chatMessageReport.upsert({
      where: {
        messageId_reporterId: { messageId, reporterId: auth.id },
      },
      create: {
        messageId,
        streamId: message.streamId,
        reporterId: auth.id,
        reason: body.reason,
        details: body.details,
      },
      update: {
        reason: body.reason,
        details: body.details,
        status: "pending",
      },
    });

    return json({ ok: true, message: "Report submitted. Thank you." });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid report");
    return error("Report failed", 500);
  }
}
