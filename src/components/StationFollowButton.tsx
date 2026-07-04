"use client";

import { UserPlus, UserCheck } from "lucide-react";
import { useStationFollow } from "@/hooks/useStationFollow";

export function StationFollowButton({
  slug,
  showCount = true,
  className = "",
}: {
  slug: string;
  showCount?: boolean;
  className?: string;
}) {
  const { following, followerCount, checked, loading, error, authLoading, toggle } =
    useStationFollow(slug);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={loading || !checked || authLoading}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 ${
            following
              ? "bg-white/[0.08] border border-white/15 text-zinc-300"
              : "bg-[#53fc18]/10 border border-[#53fc18]/30 text-[#53fc18] hover:bg-[#53fc18]/20"
          }`}
        >
          {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {!checked || authLoading
            ? "..."
            : following
              ? "Following"
              : "Follow station"}
        </button>
        {showCount && checked && (
          <span className="text-xs text-zinc-500">
            {followerCount.toLocaleString()} followers
          </span>
        )}
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
