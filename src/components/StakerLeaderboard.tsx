"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { DROP_TOKEN_SYMBOL } from "@/lib/constants";

export type StakerLeaderboardEntry = {
  displayName: string;
  username: string;
  avatar: string;
  amount: number;
};

export function StakerLeaderboard({
  stakers,
  title = "Top supporters",
  emptyLabel = "No members yet — be the first!",
}: {
  stakers: StakerLeaderboardEntry[];
  title?: string;
  emptyLabel?: string;
}) {
  if (stakers.length === 0) {
    return (
      <div className="pt-2 border-t border-white/10">
        <p className="text-[10px] font-bold uppercase text-zinc-500 mb-2">{title}</p>
        <p className="text-xs text-zinc-500">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="pt-2 border-t border-white/10 space-y-2">
      <p className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1">
        <Crown className="h-3 w-3" />
        {title}
      </p>
      <ul className="space-y-1.5">
        {stakers.map((s, i) => (
          <li key={s.username} className="flex items-center gap-2 text-sm">
            <span className="text-[10px] font-mono text-zinc-600 w-4 shrink-0">{i + 1}</span>
            <Link
              href={`/dj/${s.username}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#53fc18]/20 to-cyan-500/20 text-xs font-bold hover:scale-105 transition-transform"
            >
              {s.avatar || s.displayName.slice(0, 1)}
            </Link>
            <Link href={`/dj/${s.username}`} className="flex-1 min-w-0 truncate hover:text-[#53fc18]">
              {s.displayName}
            </Link>
            <span className="text-xs font-mono text-[#53fc18] shrink-0">
              {s.amount} {DROP_TOKEN_SYMBOL}/mo
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
