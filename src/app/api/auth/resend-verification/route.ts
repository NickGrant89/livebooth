import { z } from "zod";
import { json, error } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { maskEmail, userNeedsEmailVerification } from "@/lib/email-verification";
import { sendUserVerificationEmail } from "@/lib/send-verification-email";

const schema = z.object({
  email: z.string().min(1),
});

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "resend-verification", 5, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = schema.parse(await request.json());
    const identifier = body.email.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier.replace(/@.*/, "") }],
      },
      select: { id: true, email: true, displayName: true, emailVerifiedAt: true, role: true },
    });

    if (user && userNeedsEmailVerification(user)) {
      await sendUserVerificationEmail(user);
    }

    return json({
      ok: true,
      message: "If that account needs verification, a new link has been sent.",
      ...(process.env.NODE_ENV !== "production" && user && userNeedsEmailVerification(user)
        ? { maskedEmail: maskEmail(user.email) }
        : {}),
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Email required");
    return error("Request failed", 500);
  }
}
