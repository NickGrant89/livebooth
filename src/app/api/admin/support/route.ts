import { prisma } from "@/lib/db";
import { json, error, isApiError } from "@/lib/api-utils";
import { requireAdminApi, logAdminAction } from "@/lib/admin";
import { z } from "zod";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  const status = new URL(request.url).searchParams.get("status") ?? "open";

  const tickets = await prisma.supportTicket.findMany({
    where: status === "all" ? {} : { status },
    include: { user: { select: { username: true, displayName: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return json({
    tickets: tickets.map((t) => ({
      id: t.id,
      email: t.email,
      category: t.category,
      subject: t.subject,
      body: t.body,
      status: t.status,
      adminNotes: t.adminNotes,
      user: t.user,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}

const patchSchema = z.object({
  ticketId: z.string(),
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  adminNotes: z.string().optional(),
});

export async function PATCH(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const body = patchSchema.parse(await request.json());
    const ticket = await prisma.supportTicket.update({
      where: { id: body.ticketId },
      data: {
        status: body.status,
        adminNotes: body.adminNotes,
      },
    });
    await logAdminAction(admin.id, "ticket_update", body.ticketId, body, request);
    return json({ ticket: { id: ticket.id, status: ticket.status } });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    return error("Update failed", 500);
  }
}
