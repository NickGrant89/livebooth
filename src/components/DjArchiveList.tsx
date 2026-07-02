"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Radio, Trash2, Loader2 } from "lucide-react";
import { genreLabels, DROP_TOKEN_SYMBOL } from "@/lib/constants";
import { hasStreamReplay } from "@/lib/playback-url";
import { apiFetch } from "@/lib/fetch-client";

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
      : "border-white/5 bg-[#141416]/50"
  }`;

export function DjArchiveList({
  streams,
  liveStreamId,
  canDelete = false,
}: {
  streams: ArchiveStream[];
  liveStreamId?: string;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteArchive(streamId: string, title: string) {
    if (!confirm(`Delete "${title}" from your archive? This cannot be undone.`)) return;
    setDeletingId(streamId);
    try {
      const res = await apiFetch(`/api/streams/${streamId}/archive`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "Failed to delete");
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (streams.length === 0 && !liveStreamId) {
    return (
      <p className="text-sm text-zinc-500 rounded-xl border border-white/5 bg-[#141416] px-4 py-8 text-center">
        No replays yet — ended sets appear here after you finish streaming.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {streams.map((s) => {
        const duration = formatDuration(s.startedAt, s.endedAt);
        const hasReplay = hasStreamReplay(s.vodUrl, s.playbackUrl);
        const inner = <ArchiveRowContent stream={s} duration={duration} hasReplay={hasReplay} />;

        return (
          <div key={s.id} className={`${rowClass(hasReplay)} group`}>
            {hasReplay ? (
              <Link href={`/vod/${s.id}`} className="flex flex-1 items-center gap-4 min-w-0">
                {inner}
              </Link>
            ) : (
              <div className="flex flex-1 items-center gap-4 min-w-0 opacity-60">{inner}</div>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => deleteArchive(s.id, s.title)}
                disabled={deletingId === s.id}
                className="shrink-0 rounded-lg border border-white/10 p-2 text-zinc-500 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                aria-label={`Delete ${s.title}`}
              >
                {deletingId === s.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
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
