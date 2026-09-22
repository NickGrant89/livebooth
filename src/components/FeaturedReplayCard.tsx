import Link from "next/link";
import { Play, Star } from "lucide-react";
import { genreLabels, DROP_TOKEN_SYMBOL } from "@/lib/constants";
import type { ArchiveStream } from "@/components/DjArchiveList";

export function FeaturedReplayCard({ stream }: { stream: ArchiveStream }) {
  const date =
    stream.endedAt ?? stream.startedAt
      ? new Date((stream.endedAt ?? stream.startedAt)!).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

  return (
    <Link
      href={`/vod/${stream.id}`}
      className="block rounded-2xl border border-[#53fc18]/30 bg-gradient-to-br from-[#53fc18]/10 to-cyan-500/5 p-5 hover:border-[#53fc18]/50 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#53fc18]/15 border border-[#53fc18]/30">
          <Play className="h-6 w-6 text-[#53fc18]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#53fc18] flex items-center gap-1">
            <Star className="h-3 w-3 fill-current" />
            Featured set
          </p>
          <p className="font-semibold text-white mt-1 truncate">{stream.title}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {date ? `${date} · ` : ""}
            {genreLabels[stream.genre] ?? stream.genre}
            {stream.setGrade ? ` · Grade ${stream.setGrade}` : ""}
            {stream.totalTips > 0 ? ` · ${Math.round(stream.totalTips)} ${DROP_TOKEN_SYMBOL}` : ""}
          </p>
          <p className="text-xs text-[#53fc18] mt-2">Watch replay →</p>
        </div>
      </div>
    </Link>
  );
}
