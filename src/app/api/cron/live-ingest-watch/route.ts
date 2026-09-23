import { error, json } from "@/lib/api-utils";
import { processLiveIngestWatch } from "@/lib/live-ingest-watch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel cron — end live streams when OBS/RTMP ingest stops (even if DJ closed the browser). */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return error("Cron not configured", 503);

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return error("Unauthorized", 401);

  const result = await processLiveIngestWatch();
  return json({ ok: true, ...result });
}
