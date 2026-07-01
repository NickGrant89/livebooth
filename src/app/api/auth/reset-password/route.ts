import { json, error } from "@/lib/api-utils";
import { resetPasswordWithToken } from "@/lib/password-reset";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const result = await resetPasswordWithToken(body.token, body.password);
    if (!result.ok) return error(result.error, 400);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return error("Invalid reset request");
    return error("Reset failed", 500);
  }
}
