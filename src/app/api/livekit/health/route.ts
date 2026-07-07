import { json } from "@/lib/api-utils";
import { isLiveKitConfigured } from "@/lib/livekit";

export const dynamic = "force-dynamic";

/** Public check — is WebRTC collab enabled on this deployment? */
export async function GET() {
  const url = process.env.LIVEKIT_URL?.replace(/\/$/, "") ?? "";
  let reachable: boolean | null = null;

  if (url) {
    const httpBase = url.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
    try {
      const res = await fetch(httpBase, {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      reachable = res.ok;
    } catch {
      reachable = false;
    }
  }

  return json({
    enabled: isLiveKitConfigured(),
    reachable,
    urlHost: url ? url.replace(/^wss?:\/\//, "").split("/")[0] : null,
  });
}
