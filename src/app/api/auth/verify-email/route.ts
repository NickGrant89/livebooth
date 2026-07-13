import { z } from "zod";
import { json, error } from "@/lib/api-utils";
import { createSession, setSessionCookie } from "@/lib/auth";
import { verifyEmailWithToken } from "@/lib/email-verification";

const schema = z.object({
  token: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const result = await verifyEmailWithToken(body.token);

    if (!result.ok) {
      return error(result.error, 400);
    }

    const jwt = await createSession(result.userId);
    await setSessionCookie(jwt);

    return json({ ok: true, message: "Email verified — you're signed in." });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Verification token required");
    return error("Verification failed", 500);
  }
}
