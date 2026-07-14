import { prisma } from "@/lib/db";
import { json, error, isApiError } from "@/lib/api-utils";
import { requireStaffApi, logAdminAction } from "@/lib/admin";
import { notifyUser } from "@/lib/notifications";
import { isSupportTicketUnread } from "@/lib/support-ticket-unread";
import { z } from "zod";

export async function GET(request: Request) {
  const staff = await requireStaffApi(request);
  if (isApiError(staff)) return staff;

  const statusParam = new URL(request.url).searchParams.get("status") ?? "open";
  const assignee = new URL(request.url).searchParams.get("assignee");

  const where: {
    status?: string | { in: string[] };
    assignedAdminId?: string | null;
  } = {};

  if (statusParam === "open") {
    where.status = { in: ["open", "in_progress"] };
  } else if (statusParam === "closed") {
    where.status = "resolved";
  } else if (statusParam === "all") {
    // legacy: no status filter
  } else {
    where.status = statusParam;
  }

  if (assignee === "unassigned") {
    where.assignedAdminId = null;
  } else if (assignee === "me") {
    where.assignedAdminId = staff.id;
  } else if (assignee) {
    where.assignedAdminId = assignee;
  }

  const [tickets, admins] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { username: true, displayName: true, role: true, email: true } },
        assignedAdmin: { select: { id: true, username: true, displayName: true } },
        messages: { orderBy: { createdAt: "asc" }, take: 50 },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.user.findMany({
      where: { role: { in: ["admin", "moderator"] }, suspendedAt: null },
      select: { id: true, username: true, displayName: true, role: true },
      orderBy: { displayName: "asc" },
    }),
  ]);

  return json({
    admins,
    tickets: tickets.map((t) => ({
      id: t.id,
      email: t.email,
      category: t.category,
      subject: t.subject,
      body: t.body,
      status: t.status,
      adminNotes: t.adminNotes,
      lastMessageRole: t.lastMessageRole,
      lastMessageAt: t.lastMessageAt?.toISOString() ?? null,
      adminReadAt: t.adminReadAt?.toISOString() ?? null,
      assignedAdminId: t.assignedAdminId,
      assignedAdmin: t.assignedAdmin,
      unread: isSupportTicketUnread(t),
      user: t.user,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      messages: t.messages.map((m) => ({
        id: m.id,
        senderRole: m.senderRole,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    })),
  });
}

const patchSchema = z.object({
  ticketId: z.string(),
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  adminNotes: z.string().optional(),
  assignedAdminId: z.string().nullable().optional(),
});

export async function PATCH(request: Request) {
  const staff = await requireStaffApi(request);
  if (isApiError(staff)) return staff;

  try {
    const body = patchSchema.parse(await request.json());

    const existing = await prisma.supportTicket.findUnique({
      where: { id: body.ticketId },
      select: { assignedAdminId: true, subject: true, status: true },
    });
    if (!existing) return error("Ticket not found", 404);

    if (body.assignedAdminId) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: body.assignedAdminId,
          role: { in: ["admin", "moderator"] },
          suspendedAt: null,
        },
        select: { id: true },
      });
      if (!assignee) return error("Assignee must be active staff", 400);
    }

    const data: {
      status?: string;
      adminNotes?: string;
      assignedAdminId?: string | null;
    } = {};

    if (body.status !== undefined) data.status = body.status;
    if (body.adminNotes !== undefined) data.adminNotes = body.adminNotes;
    if (body.assignedAdminId !== undefined) {
      data.assignedAdminId = body.assignedAdminId;
      if (body.assignedAdminId && existing.status === "open") {
        data.status = "in_progress";
      }
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: body.ticketId },
      data,
    });

    if (
      body.assignedAdminId &&
      body.assignedAdminId !== existing.assignedAdminId &&
      body.assignedAdminId !== staff.id
    ) {
      await notifyUser(
        body.assignedAdminId,
        "support_assigned",
        "Support ticket assigned to you",
        existing.subject,
        "/admin",
      );
    }

    await logAdminAction(staff.id, "ticket_update", body.ticketId, body, request);
    return json({
      ticket: {
        id: ticket.id,
        status: ticket.status,
        assignedAdminId: ticket.assignedAdminId,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    return error("Update failed", 500);
  }
}
