import { apiFetch } from "@/lib/fetch-client";
import type { RecapData } from "@/components/SessionRecapModal";

type EndLiveSessionResult =
  | { ok: true; endedBy: "client" | "server"; recap?: RecapData | null }
  | { ok: false; error: string };

/** Coerce stored/API recap JSON into a safe shape for SessionRecapModal. */
export function normalizeRecap(raw: unknown): RecapData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.streamId !== "string" || typeof r.title !== "string") return null;

  const topTippers: RecapData["topTippers"] = [];
  if (Array.isArray(r.topTippers)) {
    for (const entry of r.topTippers) {
      if (!entry || typeof entry !== "object") continue;
      const t = entry as { name?: unknown; total?: unknown };
      if (typeof t.name !== "string" || typeof t.total !== "number") continue;
      topTippers.push({ name: t.name, total: t.total });
    }
  }

  return {
    streamId: r.streamId,
    title: r.title,
    djName: typeof r.djName === "string" ? r.djName : "DJ",
    djUsername: typeof r.djUsername === "string" ? r.djUsername : "",
    streak: typeof r.streak === "number" ? r.streak : undefined,
    peakViewers: typeof r.peakViewers === "number" ? r.peakViewers : 0,
    totalTips: typeof r.totalTips === "number" ? r.totalTips : 0,
    durationMin: typeof r.durationMin === "number" ? r.durationMin : 0,
    tipCount: typeof r.tipCount === "number" ? r.tipCount : 0,
    unlockCount: typeof r.unlockCount === "number" ? r.unlockCount : 0,
    setScore: typeof r.setScore === "number" ? r.setScore : null,
    setGrade: typeof r.setGrade === "string" ? r.setGrade : null,
    questContributions: typeof r.questContributions === "number" ? r.questContributions : undefined,
    topTippers,
  };
}

/** End live session, or sync UI if cron/OBS already ended it server-side. */
export async function endLiveSessionOnServer(): Promise<EndLiveSessionResult> {
  const res = await apiFetch("/api/streams/go-live", { method: "DELETE" });
  let data: { error?: string; recap?: unknown } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    /* empty body */
  }

  if (res.ok) {
    return {
      ok: true,
      endedBy: "client",
      recap: normalizeRecap(data.recap),
    };
  }

  if (res.status === 404) {
    const recap = await fetchLatestRecap();
    return { ok: true, endedBy: "server", recap };
  }

  return { ok: false, error: data.error ?? "Could not end stream" };
}

/** Load recap for the DJ's most recently ended set. */
export async function fetchLatestRecap(): Promise<RecapData | null> {
  const summaryRes = await apiFetch("/api/dashboard/summary");
  if (!summaryRes.ok) return null;
  const summary = (await summaryRes.json()) as { lastSet?: { id: string } | null };
  const streamId = summary.lastSet?.id;
  if (!streamId) return null;

  const statsRes = await apiFetch(`/api/stream-stats/${streamId}`);
  if (!statsRes.ok) return null;
  const stats = (await statsRes.json()) as { recap?: unknown };
  return normalizeRecap(stats.recap);
}
