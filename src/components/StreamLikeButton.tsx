"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";

export function StreamLikeButton({
  streamId,
  className = "",
}: {
  streamId: string;
  className?: string;
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    apiFetch(`/api/streams/${streamId}/likes`)
      .then((r) => r.json())
      .then((d) => {
        setLiked(Boolean(d.liked));
        setCount(d.count ?? 0);
      })
      .finally(() => setChecked(true));
  }, [streamId]);

  async function toggle() {
    if (!user) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setLoading(true);
    const res = await apiFetch(`/api/streams/${streamId}/likes`, {
      method: liked ? "DELETE" : "POST",
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setLiked(data.liked);
      setCount(data.count ?? count);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading || !checked}
      aria-pressed={liked}
      aria-label={liked ? "Unlike stream" : "Like stream"}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 sm:px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 shrink-0 ${
        liked
          ? "bg-pink-500/15 border border-pink-500/40 text-pink-300"
          : "bg-white/[0.06] border border-white/10 text-zinc-300 hover:border-pink-500/30 hover:text-pink-200"
      } ${className}`}
    >
      <Heart className={`h-4 w-4 shrink-0 ${liked ? "fill-current" : ""}`} />
      <span>{!checked ? "…" : count > 0 ? count.toLocaleString() : "Like"}</span>
    </button>
  );
}
