import Link from "next/link";
import { Coins, Eye, Heart, Radio } from "lucide-react";
import { genreLabels } from "@/lib/constants";

interface StreamCardProps {
  stream: {
    id: string;
    title: string;
    genre: string;
    viewers: number;
    sessionTips?: number;
    likeCount?: number;
    dj: { username: string; displayName: string; avatar: string };
  };
  sponsored?: boolean;
  featured?: boolean;
}

export function StreamCard({ stream, sponsored }: StreamCardProps) {
  return (
    <Link
      href={`/stream/${stream.dj.username}`}
      className="group glass glass-hover rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
    >
      <div className="relative aspect-video bg-gradient-to-br from-[#0f172a] via-[#1e1b4b]/40 to-[#0a0a0f] flex items-center justify-center">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_center,rgba(83,252,24,0.1),transparent_70%)]" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#53fc18] to-[#00f0ff] text-xl font-bold text-black shadow-lg shadow-[#53fc18]/20 group-hover:scale-110 transition-transform duration-300">
          {stream.dj.avatar}
        </div>
        <span className="absolute top-2.5 left-2.5 live-pulse flex items-center gap-1 rounded-md bg-red-600/90 px-2 py-0.5 text-[10px] font-bold uppercase">
          <Radio className="h-2.5 w-2.5" />
          Live
        </span>
        <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-md bg-black/60 backdrop-blur px-2 py-0.5 text-[11px] font-mono">
          <Eye className="h-3 w-3" />
          {stream.viewers.toLocaleString()} session peak
        </span>
        {sponsored ? (
          <span className="absolute top-2.5 right-2.5 rounded-md bg-amber-500/25 backdrop-blur px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
            Sponsored
          </span>
        ) : stream.sessionTips != null && stream.sessionTips > 0 ? (
          <span className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-md bg-[#53fc18]/20 backdrop-blur px-2 py-0.5 text-[11px] font-semibold text-[#53fc18]">
            <Coins className="h-3 w-3" />
            {stream.sessionTips.toLocaleString()} tipped
          </span>
        ) : null}
        <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/60 backdrop-blur px-2 py-0.5 text-[11px]">
          {genreLabels[stream.genre] ?? stream.genre}
        </span>
      </div>
      <div className="p-3.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-white group-hover:text-[#53fc18] transition-colors line-clamp-1">
            {stream.title}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">{stream.dj.displayName}</p>
        </div>
        {(stream.likeCount ?? 0) > 0 ? (
          <span className="flex items-center gap-1 text-xs text-pink-300/90 shrink-0 pt-0.5">
            <Heart className="h-3.5 w-3.5 fill-current" />
            {stream.likeCount!.toLocaleString()}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
