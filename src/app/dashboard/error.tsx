"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-xl font-bold mb-2">Dashboard unavailable</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Something went wrong loading your dashboard. This can happen right after a stream ends — try again.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-[#53fc18] px-5 py-2.5 text-sm font-bold text-black"
        >
          Try again
        </button>
        <a
          href="/go-live"
          className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
        >
          Go Live
        </a>
      </div>
    </div>
  );
}
