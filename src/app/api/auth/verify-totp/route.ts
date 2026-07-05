import { prisma } from "@/lib/db";
import { json, error } from "@/lib/api-utils";
import { createSession, setSessionCookie } from "@/lib/auth";
import { verifyTotpPendingToken, verifyTotpCode } from "@/lib/admin-totp";
import { enforceRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  pendingToken: z.string(),
  code: z.string().min(6).max(8),
});

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "verify-totp", 10, 15 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = schema.parse(await request.json());
    const userId = await verifyTotpPendingToken(body.pendingToken);
    if (!userId) return error("Session expired — log in again", 401);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, role: true, totpSecret: true, totpEnabled: true },
    });
    if (!user?.totpEnabled || !user.totpSecret) return error("2FA not configured", 400);
    if (!verifyTotpCode(user.totpSecret, body.code)) return error("Invalid code", 401);

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
    if (e instanceof z.ZodError) return error("Code required");
    return error("Verification failed", 500);
  }
}
