import { requireApiUser, isApiError, json, error } from "@/lib/api-utils";
import { getOwnedStation, getTierMeta } from "@/lib/stations";

export async function POST() {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const station = await getOwnedStation(auth.id);
  if (!station) return error("No station owned by this account", 404);

  const tierMeta = getTierMeta(station.tier);
  if (!tierMeta.relayMode) {
    return error("Relay mode requires Pro tier or higher — contact support to upgrade", 403);
  }

  const url = station.relayUrl?.trim();
  if (!url) return error("Set a relay URL first, then verify", 400);

  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "LiveBooth-RelayVerify/1.0" },
    });
    if (!res.ok && res.status !== 405) {
      return json({
        ok: false,
        status: res.status,
        message: `Relay returned HTTP ${res.status} — check the URL is a live HLS or stream endpoint`,
      });
    }
    return json({
      ok: true,
      message: "Relay URL is reachable",
      status: res.status,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    return json({
      ok: false,
      message: `Could not reach relay URL: ${msg}`,
    });
  }
}
