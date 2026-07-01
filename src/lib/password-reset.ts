import bcrypt from "bcryptjs";
import { prisma } from "./db";

const RESET_HOURS = 1;

export async function createPasswordResetToken(email: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: email.toLowerCase() }, { username: email.toLowerCase().replace(/@.*/, "") }],
    },
  });

  // Always return success to avoid email enumeration
  if (!user) {
    return { ok: true as const, token: null, user: null };
  }

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  return { ok: true as const, token, user };
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false as const, error: "Invalid or expired reset link" };
  }
  if (newPassword.length < 6) {
    return { ok: false as const, error: "Password must be at least 6 characters" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true as const };
}

export function getResetUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3008";
  return `${base}/reset-password?token=${token}`;
}
