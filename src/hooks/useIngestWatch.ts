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
  const onIngestLostRef = useRef(onIngestLost);

  useEffect(() => {
    onIngestLostRef.current = onIngestLost;
  }, [onIngestLost]);

  useEffect(() => {
    if (!ingestKey || !isLive) {
      missesRef.current = 0;
      endingRef.current = false;
      return;
    }

    let cancelled = false;

    async function poll() {
      if (cancelled || endingRef.current) return;
      try {
        const res = await apiFetch(
          `/api/rtmp/preview-status?ingestKey=${encodeURIComponent(ingestKey!)}`,
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          proxyReady?: boolean;
          dbStream?: { status: string } | null;
        };

        if (data.dbStream?.status === "ended") {
          endingRef.current = true;
          await onIngestLostRef.current();
          return;
        }

        if (data.proxyReady) {
          missesRef.current = 0;
          return;
        }
        missesRef.current += 1;
        if (missesRef.current >= MISSES_BEFORE_AUTO_END) {
          endingRef.current = true;
          await onIngestLostRef.current();
        }
      } catch {
        /* ignore transient errors */
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [ingestKey, isLive]);
}
