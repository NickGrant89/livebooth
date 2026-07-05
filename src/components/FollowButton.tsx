"use client";

import { useEffect, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";

export function FollowButton({ username }: { username: string }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }
    apiFetch(`/api/follow/${username}`)
      .then((r) => r.json())
      .then((d) => setFollowing(Boolean(d.following)))
      .finally(() => setChecked(true));
  }, [user, username]);

  async function toggle() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    const res = await apiFetch(`/api/follow/${username}`, {
      method: following ? "DELETE" : "POST",
    });
    if (res.ok) setFollowing(!following);
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading || !checked}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 sm:px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 shrink-0 ${
        following
          ? "bg-white/[0.08] border border-white/15 text-zinc-300"
          : "bg-[#53fc18]/10 border border-[#53fc18]/30 text-[#53fc18] hover:bg-[#53fc18]/20"
      }`}
    >
      {following ? <UserCheck className="h-4 w-4 shrink-0" /> : <UserPlus className="h-4 w-4 shrink-0" />}
      <span className="truncate">
        {!checked ? "..." : following ? "Following" : "Follow"}
      </span>
    </button>
  );
}
