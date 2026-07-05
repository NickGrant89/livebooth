import Link from "next/link";
import { Play, Tv } from "lucide-react";
import { genreLabels, DROP_TOKEN_SYMBOL } from "@/lib/constants";
import { hasStreamReplay } from "@/lib/playback-url";

export type StationPastBroadcast = {
  id: string;
  title: string;
  genre: string;
  peakViewers: number;
  totalTips: number;
  setGrade: string | null;
  setScore: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
  vodUrl: string | null;
  playbackUrl: string | null;
  ingestKey: string | null;
  stationChannel: boolean;
  dj: { username: string; displayName: string };
};

function formatDate(startedAt: Date | null, endedAt: Date | null) {
  const d = endedAt ?? startedAt;
  if (!d) return "Unknown date";
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(startedAt: Date | null, endedAt: Date | null) {
  if (!startedAt || !endedAt) return null;
  const min = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000);
  if (min < 1) return "<1 min";
  return `${min} min`;
}

function broadcastHasReplay(broadcast: StationPastBroadcast) {
  return (
    hasStreamReplay(broadcast.vodUrl, broadcast.playbackUrl) ||
    Boolean(broadcast.ingestKey?.startsWith("st_") || broadcast.ingestKey?.startsWith("lb_"))
  );
}

export function StationPastBroadcasts({
  broadcasts,
  stationName,
}: {
  broadcasts: StationPastBroadcast[];
  stationName: string;
}) {
  if (broadcasts.length === 0) {
    return (
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-lg font-bold text-white mb-2">Past broadcasts</h2>
        <p className="text-sm text-zinc-500">
          No replays yet. When {stationName} finishes a live video show, it appears here.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Past broadcasts</h2>
        <span className="text-xs text-zinc-500">
          {broadcasts.length} replay{broadcasts.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-2">
        {broadcasts.map((b) => {
          const duration = formatDuration(b.startedAt, b.endedAt);
          const hasReplay = broadcastHasReplay(b);
          const hostLabel = b.stationChannel
            ? `${stationName} studio`
            : b.dj.displayName;

          return (
            <Link
              key={b.id}
              href={`/vod/${b.id}`}
              className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors ${
                hasReplay
                  ? "border-white/10 bg-[#141416] hover:border-[#53fc18]/30"
                  : "border-white/10 bg-[#141416]/60 hover:border-white/20"
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5">
                {b.stationChannel ? (
                  <Tv className="h-5 w-5 text-[#53fc18]" />
                ) : (
                  <Play className="h-5 w-5 text-[#53fc18]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-white">{b.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {formatDate(b.startedAt, b.endedAt)}
                  {duration ? ` · ${duration}` : ""}
                  {" · "}
                  {hostLabel}
                  {" · "}
                  {genreLabels[b.genre as keyof typeof genreLabels] ?? b.genre}
                  {" · "}
                  {b.peakViewers} peak
                  {b.totalTips > 0
                    ? ` · ${Math.round(b.totalTips)} ${DROP_TOKEN_SYMBOL}`
                    : ""}
                </p>
              </div>
              {b.setGrade && (
                <span className="hidden sm:inline shrink-0 rounded-md bg-[#15CFF4]/15 px-2 py-1 text-xs font-bold text-[#15CFF4]">
                  {b.setGrade}
                </span>
              )}
              <span
                className={`shrink-0 text-xs font-semibold ${
                  hasReplay ? "text-[#53fc18]" : "text-zinc-600"
                }`}
              >
                {hasReplay ? "Watch" : "Details"}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
