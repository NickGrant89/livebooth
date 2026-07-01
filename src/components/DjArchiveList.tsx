import Link from "next/link";
import { Play, Radio } from "lucide-react";
import { genreLabels, DROP_TOKEN_SYMBOL } from "@/lib/constants";

export type ArchiveStream = {
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
};

function formatSetDate(startedAt: Date | null, endedAt: Date | null) {
  const d = endedAt ?? startedAt;
  if (!d) return "Unknown date";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(startedAt: Date | null, endedAt: Date | null) {
  if (!startedAt || !endedAt) return null;
  const min = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
  if (min < 1) return "<1 min";
  return `${min} min`;
}

function ArchiveRowContent({
  stream: s,
  duration,
  hasReplay,
}: {
  stream: ArchiveStream;
  duration: string | null;
  hasReplay: boolean;
}) {
  return (
    <>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5">
        <Play className="h-5 w-5 text-[#53fc18]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{s.title}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {formatSetDate(s.startedAt, s.endedAt)}
          {duration ? ` · ${duration}` : ""}
          {" · "}
          {genreLabels[s.genre] ?? s.genre}
          {" · "}
          {s.peakViewers} peak
          {s.totalTips > 0 ? ` · ${Math.round(s.totalTips)} ${DROP_TOKEN_SYMBOL}` : ""}
        </p>
      </div>
      {s.setGrade && (
        <span className="shrink-0 rounded-md bg-[#15CFF4]/15 px-2 py-1 text-xs font-bold text-[#15CFF4]">
          {s.setGrade}
          {s.setScore != null ? ` · ${s.setScore.toLocaleString()}` : ""}
        </span>
      )}
      {hasReplay && (
        <span className="shrink-0 text-xs font-semibold text-[#53fc18]">Replay</span>
      )}
    </>
  );
}

const rowClass = (hasReplay: boolean) =>
  `flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors ${
    hasReplay
      ? "border-white/5 bg-[#141416] hover:border-[#53fc18]/25"
      : "border-white/5 bg-[#141416]/50 opacity-60 cursor-default"
  }`;

export function DjArchiveList({
  streams,
  liveStreamId,
}: {
  streams: ArchiveStream[];
  liveStreamId?: string;
}) {
  if (streams.length === 0 && !liveStreamId) {
    return (
      <p className="text-sm text-zinc-500 rounded-xl border border-white/5 bg-[#141416] px-4 py-8 text-center">
        No replays yet — ended sets appear here after the DJ finishes streaming.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {streams.map((s) => {
        const duration = formatDuration(s.startedAt, s.endedAt);
        const hasReplay = Boolean(s.vodUrl ?? s.playbackUrl);
        if (hasReplay) {
          return (
            <Link key={s.id} href={`/vod/${s.id}`} className={rowClass(true)}>
              <ArchiveRowContent stream={s} duration={duration} hasReplay />
            </Link>
          );
        }
        return (
          <div key={s.id} className={rowClass(false)} aria-disabled>
            <ArchiveRowContent stream={s} duration={duration} hasReplay={false} />
          </div>
        );
      })}
    </div>
  );
}

export function DjProfileTabs({
  username,
  activeTab,
  isLive,
}: {
  username: string;
  activeTab: string;
  isLive: boolean;
}) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "archive", label: "Archive" },
    ...(isLive ? [{ id: "live", label: "Live now" }] : []),
  ];

  return (
    <nav className="flex gap-1 border-b border-white/10 mb-6">
      {tabs.map((tab) => {
        const href =
          tab.id === "overview"
            ? `/dj/${username}`
            : tab.id === "live"
              ? `/stream/${username}`
              : `/dj/${username}?tab=${tab.id}`;
        const active = activeTab === tab.id || (activeTab === "overview" && tab.id === "overview");
        return (
          <Link
            key={tab.id}
            href={href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-[#53fc18] text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.id === "live" && <Radio className="inline h-3.5 w-3.5 mr-1 text-red-400" />}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
