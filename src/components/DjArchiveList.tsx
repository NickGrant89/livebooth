"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Radio, Trash2, Loader2 } from "lucide-react";
import { genreLabels, DROP_TOKEN_SYMBOL } from "@/lib/constants";
import { hasStreamReplay } from "@/lib/playback-url";
import { apiFetch } from "@/lib/fetch-client";
import { SetRecordingDownloadButton } from "@/components/SetRecordingDownloadButton";

export type ArchiveStream = {
  id: string;
  title: string;
  description?: string | null;
  genre: string;
  peakViewers: number;
  totalTips: number;
  setGrade: string | null;
  setScore: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
  vodUrl: string | null;
  playbackUrl: string | null;
  hasReplay?: boolean;
  replayState?: "ready" | "processing" | "unavailable";
  dj?: { username: string; displayName: string };
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
  replayState,
  variant,
}: {
  stream: ArchiveStream;
  duration: string | null;
  hasReplay: boolean;
  replayState: "ready" | "processing" | "unavailable";
  variant: "dj" | "admin";
}) {
  return (
    <>
      {variant === "dj" && (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5">
          <Play className="h-5 w-5 text-[#53fc18]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{s.title}</p>
        {s.description ? (
          <p className="text-xs text-zinc-600 mt-0.5 line-clamp-1">{s.description}</p>
        ) : null}
        <p className="text-xs text-zinc-500 mt-0.5">
          {variant === "admin" && s.dj ? `@${s.dj.username} · ` : ""}
          {variant === "dj" && (
            <>
              {formatSetDate(s.startedAt, s.endedAt)}
              {duration ? ` · ${duration}` : ""}
              {" · "}
              {genreLabels[s.genre] ?? s.genre}
              {" · "}
            </>
          )}
          {variant === "admin" && (
            <>
              {s.peakViewers} peak · {hasReplay ? "replay available" : "no replay file"}
            </>
          )}
          {variant === "dj" && (
            <>
              {s.peakViewers} peak
              {s.totalTips > 0 ? ` · ${Math.round(s.totalTips)} ${DROP_TOKEN_SYMBOL}` : ""}
            </>
          )}
        </p>
      </div>
      {variant === "dj" && s.setGrade && (
        <span className="shrink-0 rounded-md bg-[#15CFF4]/15 px-2 py-1 text-xs font-bold text-[#15CFF4]">
          {s.setGrade}
          {s.setScore != null ? ` · ${s.setScore.toLocaleString()}` : ""}
        </span>
      )}
      {hasReplay && variant === "dj" && replayState === "processing" && (
        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </span>
      )}
      {hasReplay && variant === "dj" && replayState === "ready" && (
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
  variant = "dj",
}: {
  streams: ArchiveStream[];
  liveStreamId?: string;
  canDelete?: boolean;
  variant?: "dj" | "admin";
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allIds = useMemo(() => streams.map((s) => s.id), [streams]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  async function deleteIds(ids: string[], confirmMessage: string) {
    if (ids.length === 0) return;
    if (!confirm(confirmMessage)) return;
    setDeleting(true);
    try {
      const res = await apiFetch("/api/streams/archive/bulk", {
        method: "DELETE",
        body: JSON.stringify({ streamIds: ids }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "Failed to delete");
        return;
      }
      setSelected(new Set());
      router.refresh();
      if (variant === "admin") {
        window.dispatchEvent(new CustomEvent("livebooth:archives-updated"));
      }
    } finally {
      setDeleting(false);
    }
  }

  async function deleteOne(streamId: string, title: string) {
    await deleteIds([streamId], `Delete "${title}" from your archive? This cannot be undone.`);
  }

  if (streams.length === 0 && !liveStreamId) {
    return (
      <p className="text-sm text-zinc-500 rounded-xl border border-white/5 bg-[#141416] px-4 py-8 text-center">
        {variant === "admin"
          ? "No archived sets — missing replays are removed automatically."
          : "No replays yet — ended sets appear here after you finish streaming."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {canDelete && streams.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#141416] px-4 py-3">
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="rounded border-white/20 bg-white/5 accent-[#53fc18]"
            />
            Select all
          </label>
          {someSelected && (
            <button
              type="button"
              disabled={deleting}
              onClick={() =>
                deleteIds(
                  [...selected],
                  `Delete ${selected.size} selected set${selected.size === 1 ? "" : "s"}? This cannot be undone.`,
                )
              }
              className="rounded-lg bg-red-500/20 border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-300 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : `Delete selected (${selected.size})`}
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {streams.map((s) => {
          const duration = formatDuration(s.startedAt, s.endedAt);
          const replayState =
            s.replayState ??
            (s.hasReplay ?? hasStreamReplay(s.vodUrl, s.playbackUrl) ? "ready" : "unavailable");
          const hasReplay = replayState === "ready" || replayState === "processing";
          const inner = (
            <ArchiveRowContent
              stream={s}
              duration={duration}
              hasReplay={hasReplay}
              replayState={replayState}
              variant={variant}
            />
          );

          return (
            <div key={s.id} className={`${rowClass(hasReplay)} group`}>
              {canDelete && (
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggleOne(s.id)}
                  className="shrink-0 rounded border-white/20 bg-white/5 accent-[#53fc18]"
                  aria-label={`Select ${s.title}`}
                />
              )}
              {hasReplay ? (
                <Link href={`/vod/${s.id}`} className="flex flex-1 items-center gap-4 min-w-0">
                  {inner}
                </Link>
              ) : (
                <div className="flex flex-1 items-center gap-4 min-w-0 opacity-60">{inner}</div>
              )}
              {hasReplay && variant === "dj" && (
                <SetRecordingDownloadButton streamId={s.id} variant="icon" />
              )}
              {variant === "admin" && hasReplay && (
                <Link href={`/vod/${s.id}`} className="text-xs text-[#53fc18] underline self-center shrink-0">
                  Watch
                </Link>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => deleteOne(s.id, s.title)}
                  disabled={deleting}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
                    variant === "admin"
                      ? "bg-red-500/20 border-red-500/40 text-red-300"
                      : "border-white/10 p-2 text-zinc-500 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10"
                  }`}
                  aria-label={`Delete ${s.title}`}
                >
                  {variant === "admin" ? (
                    "Delete"
                  ) : deleting ? (
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
