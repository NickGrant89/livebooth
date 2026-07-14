"use client";

import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/fetch-client";

const POLL_MS = 15_000;
const MISSES_BEFORE_AUTO_END = 4;

/** When OBS stops publishing, auto-end the LiveBooth session (site stays in sync). */
export function useIngestWatch({
  ingestKey,
  isLive,
  onIngestLost,
}: {
  ingestKey?: string | null;
  isLive: boolean;
  onIngestLost: () => void | Promise<void>;
}) {
  const missesRef = useRef(0);
  const endingRef = useRef(false);

  useEffect(() => {
    if (!ingestKey || !isLive) {
      missesRef.current = 0;
      endingRef.current = false;
      return;
    }

    async function poll() {
      if (endingRef.current) return;
      try {
        const res = await apiFetch(
          `/api/rtmp/preview-status?ingestKey=${encodeURIComponent(ingestKey!)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { proxyReady?: boolean };
        if (data.proxyReady) {
          missesRef.current = 0;
          return;
        }
        missesRef.current += 1;
        if (missesRef.current >= MISSES_BEFORE_AUTO_END) {
          endingRef.current = true;
          await onIngestLost();
        }
      } catch {
        /* ignore transient errors */
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(id);
  }, [ingestKey, isLive, onIngestLost]);
}
