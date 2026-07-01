"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetch home discover ranking so hero/grid stay current while DJs are live. */
export function HomeDiscoverRefresh({ intervalMs = 45000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
