import { error, json } from "@/lib/api-utils";
import { processDueMembershipBillings } from "@/lib/membership";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return error("Cron not configured", 503);

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return error("Unauthorized", 401);

  const result = await processDueMembershipBillings();
  return json({ ok: true, ...result });
}
