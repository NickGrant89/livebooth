"use client";

import { Music, Lock } from "lucide-react";
import { TRACK_UNLOCK_COST } from "@/lib/constants";

interface NowPlayingBarProps {
  streamId: string;
  title: string;
  artist: string;
  bpm?: number | null;
}

export function NowPlayingBar({ title, artist, bpm }: NowPlayingBarProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-[#53fc18]/5 border-y border-[#53fc18]/10">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#53fc18]/10 shrink-0">
        <Music className="h-5 w-5 text-[#53fc18] animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-[#53fc18] font-semibold">Now Playing</p>
        <p className="font-semibold truncate">{title}</p>
        <p className="text-sm text-zinc-400 truncate">{artist}{bpm ? ` · ${bpm} BPM` : ""}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-zinc-600 shrink-0 hidden sm:flex">
        <Lock className="h-3 w-3" />
        ID · {TRACK_UNLOCK_COST} DROP
      </div>
    </div>
  );
}
