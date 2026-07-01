import { json, error } from "@/lib/api-utils";
import { createPasswordResetToken, getResetUrl } from "@/lib/password-reset";
import { sendPasswordResetEmail, isEmailConfigured } from "@/lib/email";
import { enforceRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  email: z.string().min(1),
});

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "forgot-password", 5, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = schema.parse(await request.json());
    const result = await createPasswordResetToken(body.email);

    if (result.token && result.user) {
      const url = getResetUrl(result.token);

      if (isEmailConfigured()) {
        const sent = await sendPasswordResetEmail(result.user.email, url);
        if (!sent.ok && process.env.NODE_ENV === "production") {
          console.error("[password-reset] Resend failed:", sent.error);
        }
      } else if (process.env.NODE_ENV !== "production") {
        console.info("[password-reset] Dev reset link:", url);
      } else {
        console.error(
          "[password-reset] RESEND_API_KEY / EMAIL_FROM not set — user received no email",
        );
      }
    }

    return json({
      ok: true,
      message: "If an account exists, a reset link has been sent.",
      ...(process.env.NODE_ENV !== "production" && result.token
        ? { devResetUrl: getResetUrl(result.token) }
        : {}),
    });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Email required");
    return error("Request failed", 500);
  }
}
