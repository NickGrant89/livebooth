import { prisma } from "@/lib/db";
import { json, error, isApiError } from "@/lib/api-utils";
import { requireAdminApi, logAdminAction } from "@/lib/admin";
import { getWelcomeBonus } from "@/lib/platform-settings";
import { generateInvitePassword } from "@/lib/invite-password";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createPasswordResetToken, getResetUrl } from "@/lib/password-reset";
import { sendAdminPasswordResetEmail, isEmailConfigured } from "@/lib/email";

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
  email: z.string().email().optional(),
  displayName: z.string().min(1).max(50).optional(),
  balanceAdjust: z.number().optional(),
  setBalance: z.number().min(0).optional(),
  sendPasswordReset: z.boolean().optional(),
  setPassword: z.string().min(6).optional(),
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
    if (body.email) data.email = body.email.toLowerCase();
    if (body.displayName) data.displayName = body.displayName;
    if (body.suspend === true) {
      data.suspendedAt = new Date();
      data.suspendedReason = body.suspendReason ?? "Suspended by admin";
    } else if (body.suspend === false) {
      data.suspendedAt = null;
      data.suspendedReason = null;
    }

    const target = await prisma.user.findUnique({
      where: { id: body.userId },
      include: { balance: true },
    });
    if (!target) return error("User not found", 404);

    if (body.setPassword) {
      data.passwordHash = await bcrypt.hash(body.setPassword, 10);
    }

    const user = await prisma.user.update({
      where: { id: body.userId },
      data,
    });

    if (body.balanceAdjust !== undefined || body.setBalance !== undefined) {
      const current = target.balance?.balance ?? 0;
      const next =
        body.setBalance !== undefined ? body.setBalance : current + (body.balanceAdjust ?? 0);
      await prisma.beatBalance.upsert({
        where: { userId: body.userId },
        create: { userId: body.userId, balance: Math.max(0, next), totalEarned: 0 },
        update: { balance: Math.max(0, next) },
      });
    }

    if (body.sendPasswordReset) {
      const reset = await createPasswordResetToken(target.email);
      if (reset.token && reset.user && isEmailConfigured()) {
        await sendAdminPasswordResetEmail(
          reset.user.email,
          getResetUrl(reset.token),
          target.displayName,
        );
      }
    }

    await logAdminAction(admin.id, "user_update", body.userId, { ...data, balanceAdjust: body.balanceAdjust, sendPasswordReset: body.sendPasswordReset }, request);
    return json({ user: { id: user.id, role: user.role, suspendedAt: user.suspendedAt, email: user.email, displayName: user.displayName } });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    return error("Update failed", 500);
  }
}

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(1).max(50),
  role: z.enum(["fan", "dj", "station", "admin"]).default("fan"),
});

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const body = createSchema.parse(await request.json());
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { username: body.username }] },
    });
    if (existing) return error("Email or username already taken", 409);

    const password = body.password?.trim() || generateInvitePassword();
    const passwordHash = await bcrypt.hash(password, 10);
    const welcomeBonus = await getWelcomeBonus();
    const user = await prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        displayName: body.displayName,
        passwordHash,
        role: body.role,
        avatar: body.displayName.slice(0, 2).toUpperCase(),
        emailVerifiedAt: new Date(),
        balance: { create: { balance: welcomeBonus, totalEarned: 0 } },
      },
    });

    await logAdminAction(admin.id, "user_create", user.id, { role: body.role }, request);
    return json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        tempPassword: password,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error(e.issues[0]?.message ?? "Invalid input");
    return error("Create failed", 500);
  }
}

const deleteSchema = z.object({ userId: z.string() });

export async function DELETE(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  try {
    const body = deleteSchema.parse(await request.json());
    if (body.userId === admin.id) return error("Cannot delete your own account", 400);

    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) return error("User not found", 404);

    if (user.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) return error("Cannot delete the last admin account", 400);
    }

    await prisma.user.delete({ where: { id: body.userId } });
    await logAdminAction(admin.id, "user_delete", body.userId, { username: user.username }, request);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    console.error("admin user delete:", e);
    return error("Delete failed — user may have linked data that blocks removal", 500);
  }
}
