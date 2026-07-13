import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import { json, error } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createTotpPendingToken } from "@/lib/admin-totp";
import { maskEmail, userNeedsEmailVerification } from "@/lib/email-verification";

const schema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "login", 15, 15 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = schema.parse(await request.json());
    const identifier = body.email.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier.replace(/@.*/, "") },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        passwordHash: true,
        totpEnabled: true,
        suspendedAt: true,
        emailVerifiedAt: true,
        email: true,
      },
    });
    if (!user) return error("Invalid email/username or password", 401);
    if (user.suspendedAt) return error("Account suspended", 403);

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return error("Invalid email/username or password", 401);

    if (userNeedsEmailVerification(user)) {
      return json(
        {
          error: `Verify your email before signing in. We sent a link to ${maskEmail(user.email)}.`,
          requiresVerification: true,
          email: maskEmail(user.email),
        },
        403,
      );
    }

    if (user.role === "admin" && user.totpEnabled) {
      const pendingToken = await createTotpPendingToken(user.id);
      return json({
        requiresTotp: true,
        pendingToken,
        user: { username: user.username, displayName: user.displayName },
      });
    }

    const jwt = await createSession(user.id);
    await setSessionCookie(jwt);

    return json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Email/username and password required");
    console.error("Login error:", e);
    return error("Login failed", 500);
  }
}
