import { prisma } from "./db";
import { isEmailConfigured } from "./email";

const VERIFY_HOURS = 24;

export function emailVerificationEnabled(): boolean {
  if (process.env.REQUIRE_EMAIL_VERIFICATION === "false") return false;
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return false;
  if (process.env.NODE_ENV !== "production") return false;
  return isEmailConfigured();
}

export function isUserEmailVerified(user: {
  emailVerifiedAt: Date | null;
  role?: string;
  email?: string;
}): boolean {
  if (user.emailVerifiedAt) return true;
  if (user.role === "admin") return true;
  if (user.email?.endsWith("@livebooth.local")) return true;
  return false;
}

export function userNeedsEmailVerification(user: {
  emailVerifiedAt: Date | null;
  role?: string;
  email?: string;
}): boolean {
  return emailVerificationEnabled() && !isUserEmailVerified(user);
}

export async function createEmailVerificationToken(userId: string) {
  await prisma.emailVerificationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + VERIFY_HOURS * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: { userId, token, expiresAt },
  });

  return token;
}

export async function verifyEmailWithToken(token: string) {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false as const, error: "Invalid or expired verification link" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true as const, userId: record.userId };
}

export function getVerifyEmailUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3008";
  return `${base}/verify-email?token=${token}`;
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.length <= 2 ? local[0] ?? "*" : `${local.slice(0, 2)}…`;
  return `${visible}@${domain}`;
}
