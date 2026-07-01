import { clearSessionCookie } from "@/lib/auth";
import { json } from "@/lib/api-utils";

export async function POST() {
  await clearSessionCookie();
  return json({ ok: true });
}
