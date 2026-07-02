import { prisma } from "@/lib/db";
import { logAdminAction } from "@/lib/admin";
import { json, error, requireApiUser, isApiError } from "@/lib/api-utils";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const stream = await prisma.stream.findUnique({
    where: { id },
    select: { id: true, djId: true, status: true, title: true },
  });
  if (!stream) return error("Not found", 404);
  if (stream.status !== "ended") return error("Only ended sets can be removed from archive", 400);

  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const isOwner = stream.djId === auth.id;
  const isAdmin = auth.role === "admin";

  if (!isOwner && !isAdmin) {
    return error("You can only delete your own archive sets", 403);
  }

  await prisma.stream.delete({ where: { id } });

  if (isAdmin && !isOwner) {
    await logAdminAction(auth.id, "delete_archive_stream", stream.id, { title: stream.title }, request);
  }

  return json({ ok: true });
}
