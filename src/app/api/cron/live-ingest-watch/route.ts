import { error, json } from "@/lib/api-utils";
import { scanLiveStreamsDue } from "@/lib/ai-moderation";
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
  let scanned = 0;
  try {
    const scans = await scanLiveStreamsDue();
    scanned = scans.length;
  } catch (err) {
    console.error("Live picture scan failed:", err);
  }
  return json({ ok: true, ...result, scanned });
}
