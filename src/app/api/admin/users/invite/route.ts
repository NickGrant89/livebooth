import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { json, error, isApiError } from "@/lib/api-utils";
import { requireAdminApi, logAdminAction } from "@/lib/admin";
import { sendBetaInviteEmail, isEmailConfigured } from "@/lib/email";
import { generateInvitePassword } from "@/lib/invite-password";
import { z } from "zod";

const bodySchema = z.object({
  userId: z.string(),
  /** Pass the password from user creation to email without rotating it. */
  tempPassword: z.string().min(6).optional(),
  /** When true (default if no tempPassword), sets a fresh temp password before emailing. */
  regeneratePassword: z.boolean().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if (isApiError(admin)) return admin;

  if (!isEmailConfigured()) {
    return error("Email not configured — set RESEND_API_KEY and EMAIL_FROM on Vercel", 503);
  }

  try {
    const body = bodySchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, email: true, displayName: true, username: true, role: true },
    });
    if (!user) return error("User not found", 404);

    const useExistingPassword =
      body.tempPassword != null && body.regeneratePassword === false;

    let tempPassword: string;
    if (useExistingPassword) {
      tempPassword = body.tempPassword!;
    } else {
      tempPassword = generateInvitePassword();
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(tempPassword, 10) },
      });
    }

    const sent = await sendBetaInviteEmail({
      to: user.email,
      displayName: user.displayName,
      role: user.role,
      tempPassword,
    });

    if (!sent.ok) {
      return error("Failed to send invite email", 502);
    }

    await logAdminAction(admin.id, "user_invite_sent", user.id, { email: user.email }, request);

    return json({
      ok: true,
      email: user.email,
      username: user.username,
      tempPassword,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid request");
    console.error("admin invite:", e);
    return error("Invite failed", 500);
  }
}
