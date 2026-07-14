import { z } from "zod";
import { prisma } from "@/lib/db";
import { logAdminAction } from "@/lib/admin";
import { isStaffRole } from "@/lib/staff-roles";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";

const schema = z.object({
  streamIds: z.array(z.string()).min(1).max(100),
});

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  try {
    const body = schema.parse(await request.json());
    const isStaff = isStaffRole(auth.role);

    const streams = await prisma.stream.findMany({
      where: { id: { in: body.streamIds }, status: "ended" },
      select: { id: true, djId: true, title: true },
    });

    if (streams.length === 0) {
      return error("No ended sets found to delete", 404);
    }

    const allowed = streams.filter((s) => isStaff || s.djId === auth.id);
    if (allowed.length === 0) {
      return error("You can only delete your own archive sets", 403);
    }

    if (!isStaff && allowed.length !== streams.length) {
      return error("Some selected sets are not yours", 403);
    }

    await prisma.stream.deleteMany({
      where: { id: { in: allowed.map((s) => s.id) } },
    });

    if (isStaff) {
      for (const stream of allowed) {
        if (stream.djId !== auth.id) {
          await logAdminAction(
            auth.id,
            "delete_archive_stream",
            stream.id,
            { title: stream.title, bulk: true },
            request,
          );
        }
      }
    }

    return json({ ok: true, deleted: allowed.map((s) => s.id) });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    return error("Bulk delete failed", 500);
  }
}
