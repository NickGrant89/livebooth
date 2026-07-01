"use client";

import { useEffect, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";

export function StationFollowButton({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    apiFetch(`/api/stations/${slug}/follow`)
      .then((r) => r.json())
      .then((d) => {
        setFollowing(Boolean(d.following));
        setFollowerCount(d.followerCount ?? 0);
      })
      .finally(() => setChecked(true));
  }, [slug, user]);

  async function toggle() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    const res = await apiFetch(`/api/stations/${slug}/follow`, {
      method: following ? "DELETE" : "POST",
    });
    if (res.ok) {
      setFollowing(!following);
      setFollowerCount((c) => (following ? Math.max(0, c - 1) : c + 1));
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={loading || !checked}
        className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 ${
          following
            ? "bg-white/[0.08] border border-white/15 text-zinc-300"
            : "bg-[#53fc18]/10 border border-[#53fc18]/30 text-[#53fc18] hover:bg-[#53fc18]/20"
        }`}
      >
        {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        {!checked ? "..." : following ? "Following" : "Follow station"}
      </button>
      {checked && (
        <span className="text-xs text-zinc-500">{followerCount.toLocaleString()} followers</span>
      )}
    </div>
  );
}
