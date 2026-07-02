"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { StreamPlayer, type StreamPlayerHandle } from "@/components/StreamPlayer";
import { ShareMenu } from "@/components/ShareMenu";
import { FanGradeShare } from "@/components/FanGradeShare";
import { ClipExportPanel } from "@/components/ClipExportPanel";
import { formatClipTimestamp } from "@/lib/clip-export";

type Highlight = {
  id: string;
  timestampMs: number;
  username: string;
  amount: number;
};

type VodReplayProps = {
  streamId: string;
  title: string;
  djName: string;
  djUsername: string;
  peakViewers: number;
  totalTips: number;
  playbackUrl: string;
  demoPlayback: boolean;
  recordingUnavailable?: boolean;
  highlights: Highlight[];
  setGrade?: string | null;
  setScore?: number | null;
};

function formatTimestamp(ms: number) {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function VodReplay({
  streamId,
  title,
  djName,
  djUsername,
  peakViewers,
  totalTips,
  playbackUrl,
  demoPlayback,
  recordingUnavailable = false,
  highlights,
  setGrade,
  setScore,
}: VodReplayProps) {
  const playerRef = useRef<StreamPlayerHandle>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [clipStartSec, setClipStartSec] = useState(0);
  const [clipLabel, setClipLabel] = useState<string | undefined>();

  function jumpTo(h: Highlight) {
    const sec = h.timestampMs / 1000;
    playerRef.current?.seekTo(sec);
    setActiveId(h.id);
    setClipStartSec(sec);
    setClipLabel(formatClipTimestamp(sec));
  }

  return (
    <>
      <StreamPlayer
        ref={playerRef}
        djName={djName}
        streamTitle={title}
        viewers={peakViewers}
        playbackUrl={playbackUrl}
        isLive={false}
        demoPlayback={demoPlayback}
        viewerLabel="peak"
      />
      {demoPlayback && (
        <p className="mt-3 text-xs text-amber-400/90 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          VOD replay uses the same demo HLS feed until OBS recording is wired up. Highlight jumps seek within the demo clip.
        </p>
      )}
      {recordingUnavailable && (
        <p className="mt-3 text-xs text-zinc-400 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          Recording is not available yet. If you just ended the stream, wait a minute and refresh — the archive file is written when OBS disconnects.
        </p>
      )}
      <div className="mt-4 rounded-xl border border-white/5 bg-[#141416] p-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {peakViewers} peak viewers · {totalTips} DROP tipped
          </p>
        </div>
        <ShareMenu
          kind="vod"
          path={`/vod/${streamId}`}
          djName={djName}
          setTitle={title}
          username={djUsername}
          label="Share replay"
          variant="secondary"
        />
      </div>

      <FanGradeShare
        streamId={streamId}
        djName={djName}
        djUsername={djUsername}
        title={title}
        setGrade={setGrade ?? null}
        setScore={setScore ?? null}
      />

      {highlights.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h2 className="font-semibold text-amber-200 mb-1">Legendary moments</h2>
          <p className="text-xs text-amber-200/60 mb-3">Tap a moment to jump in the replay</p>
          <ul className="space-y-1">
            {highlights.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => jumpTo(h)}
                  className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                    activeId === h.id
                      ? "bg-amber-500/20 border border-amber-500/40"
                      : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Play className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                    <span className="font-mono text-amber-100">{formatTimestamp(h.timestampMs)}</span>
                    <span className="text-zinc-400 truncate">@{h.username}</span>
                  </span>
                  <span className="text-[#53fc18] font-mono shrink-0">{h.amount} DROP</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ClipExportPanel
        playerRef={playerRef}
        streamId={streamId}
        title={title}
        djName={djName}
        djUsername={djUsername}
        startSec={clipStartSec}
        timestampLabel={clipLabel}
      />
    </>
  );
}
