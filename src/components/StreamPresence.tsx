"use client";

import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/fetch-client";

const VIEWER_KEY = "lb_viewer_key";

function randomViewerKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "lb_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getViewerKey() {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem(VIEWER_KEY);
  if (!key) {
    key = randomViewerKey();
    localStorage.setItem(VIEWER_KEY, key);
  }
  return key;
}

export function StreamPresence({
  streamId,
  onViewersChange,
}: {
  streamId: string;
  onViewersChange?: (watching: number, peak: number) => void;
}) {
  const onViewersChangeRef = useRef(onViewersChange);
  onViewersChangeRef.current = onViewersChange;

  useEffect(() => {
    const viewerKey = getViewerKey();

    async function ping() {
      const res = await apiFetch(`/api/presence/${streamId}`, {
        method: "POST",
        body: JSON.stringify({ viewerKey }),
      });
      if (res.ok) {
        const data = await res.json();
        onViewersChangeRef.current?.(data.viewers ?? 0, data.peakViewers ?? 0);
      }
    }

    async function init() {
      const getRes = await apiFetch(`/api/presence/${streamId}`);
      if (getRes.ok) {
        const data = await getRes.json();
        onViewersChangeRef.current?.(data.viewers ?? 0, data.peakViewers ?? 0);
      }
      await ping();
    }

    init();
    const interval = setInterval(ping, 30000);
    return () => clearInterval(interval);
  }, [streamId]);

  return null;
}
