"use client";

import { useEffect, useState } from "react";
import { Coins, Users } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";
import { DROP_TOKEN_SYMBOL } from "@/lib/constants";

export const STREAM_STATS_REFRESH = "livebooth:stream-stats-refresh";

export function notifyStreamStatsRefresh(streamId: string, amount?: number) {
  window.dispatchEvent(
    new CustomEvent(STREAM_STATS_REFRESH, { detail: { streamId, amount } }),
  );
}

export function StreamLiveStats({
  streamId,
  initialPeak,
  initialTips,
}: {
  streamId: string;
  initialPeak: number;
  initialTips: number;
}) {
  const [watching, setWatching] = useState<number | null>(null);
  const [peak, setPeak] = useState(initialPeak);
  const [tips, setTips] = useState(initialTips);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const [presenceRes, statsRes] = await Promise.all([
        apiFetch(`/api/presence/${streamId}`, { cache: "no-store" }),
        apiFetch(`/api/stream-stats/${streamId}`, { cache: "no-store" }),
      ]);
      if (cancelled) return;
      if (presenceRes.ok) {
        const presence = await presenceRes.json();
        setWatching(presence.viewers ?? 0);
        setPeak(presence.peakViewers ?? initialPeak);
      }
      if (statsRes.ok) {
        const stats = await statsRes.json();
        const next = Number(stats.totalTips);
        if (Number.isFinite(next)) {
          setTips((current) => Math.max(current, next));
        }
      }
    }

    function onRefresh(event: Event) {
      const detail = (event as CustomEvent<{ streamId?: string; amount?: number }>).detail;
      if (detail?.streamId && detail.streamId !== streamId) return;
      if (typeof detail?.amount === "number" && detail.amount > 0) {
        setTips((current) => current + detail.amount!);
      }
      void refresh();
    }

    void refresh();
    const interval = setInterval(refresh, 5000);
    window.addEventListener(STREAM_STATS_REFRESH, onRefresh);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener(STREAM_STATS_REFRESH, onRefresh);
    };
  }, [streamId, initialPeak]);

  return (
    <>
      <span className="flex items-center gap-1" title="Live viewers and session peak">
        <Users className="h-3 w-3 shrink-0" />
        {watching != null ? (
          <>
            <span className="text-zinc-300">{watching} watching</span>
            <span className="text-zinc-600">·</span>
          </>
        ) : null}
        <span>{peak} peak</span>
      </span>
      <span className="flex items-center gap-1 text-[#53fc18]" title="DROP tipped this set">
        <Coins className="h-3 w-3 shrink-0" />
        <span className="tabular-nums">{Math.round(tips).toLocaleString()}</span> {DROP_TOKEN_SYMBOL} tipped
      </span>
    </>
  );
}
