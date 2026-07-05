import { prisma } from "@/lib/db";
import { json, error, isApiError } from "@/lib/api-utils";
import { requireAdminApi, logAdminAction } from "@/lib/admin";
import { z } from "zod";

const schema = z.object({ ticketId: z.string() });

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const body = schema.parse(await request.json());
    await prisma.supportTicket.update({
      where: { id: body.ticketId },
      data: { adminReadAt: new Date() },
    });
    await logAdminAction(admin.id, "support_mark_read", body.ticketId, {}, request);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    return error("Update failed", 500);
  }
}
