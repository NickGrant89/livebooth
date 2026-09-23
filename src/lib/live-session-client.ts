import { apiFetch } from "@/lib/fetch-client";
import type { RecapData } from "@/components/SessionRecapModal";

type EndLiveSessionResult =
  | { ok: true; endedBy: "client" | "server"; recap?: RecapData | null }
  | { ok: false; error: string };

/** End live session, or sync UI if cron/OBS already ended it server-side. */
export async function endLiveSessionOnServer(): Promise<EndLiveSessionResult> {
  const res = await apiFetch("/api/streams/go-live", { method: "DELETE" });
  let data: { error?: string; recap?: RecapData } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    /* empty body */
  }

  if (res.ok) {
    return { ok: true, endedBy: "client", recap: data.recap ?? null };
  }

  if (res.status === 404) {
    const recap = await fetchLatestRecap();
    return { ok: true, endedBy: "server", recap };
  }

  return { ok: false, error: data.error ?? "Could not end stream" };
}

async function fetchLatestRecap(): Promise<RecapData | null> {
  const summaryRes = await apiFetch("/api/dashboard/summary");
  if (!summaryRes.ok) return null;
  const summary = (await summaryRes.json()) as { lastSet?: { id: string } | null };
  const streamId = summary.lastSet?.id;
  if (!streamId) return null;

  const statsRes = await apiFetch(`/api/stream-stats/${streamId}`);
  if (!statsRes.ok) return null;
  const stats = (await statsRes.json()) as { recap?: RecapData | null };
  return stats.recap ?? null;
}
