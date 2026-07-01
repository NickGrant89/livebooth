"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";

export function StreamLiveStats({
  streamId,
  initialPeak,
}: {
  streamId: string;
  initialPeak: number;
}) {
  const [watching, setWatching] = useState<number | null>(null);
  const [peak, setPeak] = useState(initialPeak);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const res = await apiFetch(`/api/presence/${streamId}`);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setWatching(data.viewers ?? 0);
      setPeak(data.peakViewers ?? initialPeak);
    }

    refresh();
    const interval = setInterval(refresh, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamId, initialPeak]);

  return (
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
  );
}
