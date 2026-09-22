"use client";

import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/fetch-client";

export function PinFeaturedStreamButton({
  streamId,
  streamTitle,
  featuredStreamId,
}: {
  streamId: string;
  streamTitle: string;
  featuredStreamId: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isPinned = featuredStreamId === streamId;

  async function togglePin() {
    setLoading(true);
    const next = isPinned ? null : streamId;
    const res = await apiFetch("/api/profile", {
      method: "PATCH",
      body: JSON.stringify({ featuredStreamId: next }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={togglePin}
      disabled={loading}
      title={isPinned ? "Unpin from profile" : "Pin to profile"}
      className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50 ${
        isPinned
          ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
          : "border-white/10 text-zinc-500 hover:text-amber-200 hover:border-amber-500/30"
      }`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <span className="inline-flex items-center gap-1">
          <Star className={`h-3.5 w-3.5 ${isPinned ? "fill-current" : ""}`} />
          {isPinned ? "Pinned" : "Pin"}
        </span>
      )}
      <span className="sr-only">{streamTitle}</span>
    </button>
  );
}
