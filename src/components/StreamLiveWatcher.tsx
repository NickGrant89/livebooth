"use client";

import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/fetch-client";

/** When the booth goes offline, hard-navigate so fans see the offline page (avoids refresh/hydration glitches). */
export function StreamLiveWatcher({ username }: { username: string }) {
  const redirectedRef = useRef(false);

  useEffect(() => {
    async function poll() {
      if (redirectedRef.current) return;
      const res = await apiFetch(`/api/streams/${encodeURIComponent(username)}`);
      if (res.status !== 404) return;
      redirectedRef.current = true;
      const path = `/stream/${encodeURIComponent(username)}`;
      if (window.location.pathname === path) {
        window.location.replace(path);
      } else {
        window.location.href = path;
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), 15_000);
    return () => window.clearInterval(id);
  }, [username]);

  return null;
}
