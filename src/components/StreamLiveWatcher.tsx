"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/fetch-client";

/** Polls booth status — refreshes the page when the host is no longer live. */
export function StreamLiveWatcher({ username }: { username: string }) {
  const router = useRouter();

  useEffect(() => {
    async function poll() {
      const res = await apiFetch(`/api/streams/${encodeURIComponent(username)}`);
      if (res.status === 404) router.refresh();
    }

    void poll();
    const id = window.setInterval(() => void poll(), 15_000);
    return () => window.clearInterval(id);
  }, [username, router]);

  return null;
}
