import { prisma } from "@/lib/db";
import { json, error, isApiError } from "@/lib/api-utils";
import { requireAdminApi, logAdminAction } from "@/lib/admin";
import { z } from "zod";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  const q = new URL(request.url).searchParams.get("q")?.trim();
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { username: { contains: q } },
            { email: { contains: q } },
            { displayName: { contains: q } },
          ],
        }
      : undefined,
    include: {
      balance: true,
      _count: { select: { streams: true, followers: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      avatar: u.avatar,
      suspendedAt: u.suspendedAt?.toISOString() ?? null,
      suspendedReason: u.suspendedReason,
      balance: u.balance?.balance ?? 0,
      streamCount: u._count.streams,
      followers: u._count.followers,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}

const patchSchema = z.object({
  userId: z.string(),
  role: z.enum(["fan", "dj", "station", "admin"]).optional(),
  suspend: z.boolean().optional(),
  suspendReason: z.string().optional(),
});

export async function PATCH(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const body = patchSchema.parse(await request.json());
    if (body.userId === admin.id && body.role && body.role !== "admin") {
      return error("Cannot demote your own admin account", 400);
    }

    const data: Record<string, unknown> = {};
    if (body.role) data.role = body.role;
    if (body.suspend === true) {
      data.suspendedAt = new Date();
      data.suspendedReason = body.suspendReason ?? "Suspended by admin";
    } else if (body.suspend === false) {
      data.suspendedAt = null;
      data.suspendedReason = null;
    }

    const user = await prisma.user.update({
      where: { id: body.userId },
      data,
    });

    await logAdminAction(admin.id, "user_update", body.userId, data, request);
    return json({ user: { id: user.id, role: user.role, suspendedAt: user.suspendedAt } });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    return error("Update failed", 500);
  }
}
