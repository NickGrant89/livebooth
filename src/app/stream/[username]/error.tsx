"use client";

import Link from "next/link";

export default function StreamPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-xl font-bold mb-2">Stream page unavailable</h1>
      <p className="text-sm text-zinc-400 mb-6">
        This can happen when a set just ended. Refresh or head back to Discover.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-[#53fc18] px-5 py-2.5 text-sm font-bold text-black"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
        >
          Discover
        </Link>
      </div>
    </div>
  );
}
