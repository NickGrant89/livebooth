"use client";

import { useState, type RefObject } from "react";
import { Download, Film, Loader2 } from "lucide-react";
import type { StreamPlayerHandle } from "@/components/StreamPlayer";
import { getClientSiteUrl } from "@/lib/share";
import {
  downloadBlob,
  exportVerticalClip,
  formatClipTimestamp,
} from "@/lib/clip-export";

type ClipExportPanelProps = {
  playerRef: RefObject<StreamPlayerHandle | null>;
  streamId: string;
  title: string;
  djName: string;
  djUsername: string;
  startSec?: number;
  timestampLabel?: string;
};

export function ClipExportPanel({
  playerRef,
  title,
  djName,
  djUsername,
  startSec = 0,
  timestampLabel,
}: ClipExportPanelProps) {
  const [duration, setDuration] = useState<30 | 60>(30);
  const [exporting, setExporting] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const clipCardUrl = `${getClientSiteUrl()}/api/og?${new URLSearchParams({
    type: "clip",
    dj: djName,
    title,
    username: djUsername,
    timestamp: timestampLabel ?? formatClipTimestamp(startSec),
  }).toString()}`;

  const safeName = title.replace(/[^\w\s-]/g, "").trim().slice(0, 30) || "clip";

  async function exportVideo() {
    setError("");
    const video = playerRef.current?.getVideoElement();
    if (!video) {
      setError("Player not ready — wait for the replay to load.");
      return;
    }

    const player = playerRef.current;
    if (!player) {
      setError("Player not ready — wait for the replay to load.");
      return;
    }

    setExporting(true);
    setProgress(0);
    try {
      await player.ensureExportReady();
      const blob = await exportVerticalClip(
        video,
        startSec,
        duration,
        `@${djUsername}`,
        setProgress,
      );
      downloadBlob(blob, `livebooth-${safeName}-${duration}s.webm`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
      setProgress(0);
    }
  }

  async function downloadShareCard() {
    setDownloadingCard(true);
    setError("");
    try {
      const res = await fetch(clipCardUrl);
      if (!res.ok) throw new Error("Could not generate share card");
      downloadBlob(await res.blob(), `livebooth-${safeName}-card.png`);
    } catch {
      setError("Share card download failed — opening image in a new tab.");
      window.open(clipCardUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingCard(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-white/5 bg-[#141416] p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Film className="h-4 w-4 text-[#15CFF4]" />
        <h2 className="font-semibold text-sm">Export clip (9:16)</h2>
      </div>
      <p className="text-xs text-zinc-500">
        {timestampLabel
          ? `Clip from ${timestampLabel} · vertical for TikTok / Reels / Stories`
          : "Vertical clip from replay start · for TikTok / Reels / Stories"}
      </p>

      <div className="flex flex-wrap gap-2">
        {([30, 60] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDuration(d)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              duration === d
                ? "bg-[#15CFF4]/20 text-[#15CFF4] border border-[#15CFF4]/40"
                : "bg-white/5 text-zinc-400 border border-transparent"
            }`}
          >
            {d}s
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {exporting && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#15CFF4] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-500">Recording {duration}s clip… {progress}%</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportVideo}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#53fc18] to-[#15CFF4] px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Film className="h-4 w-4" />
          )}
          {exporting ? "Exporting…" : `Download ${duration}s clip`}
        </button>
        <button
          type="button"
          onClick={downloadShareCard}
          disabled={downloadingCard || exporting}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10 disabled:opacity-50"
        >
          {downloadingCard ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Share card (PNG)
        </button>
      </div>
      <p className="text-[10px] text-zinc-600">
        Video clip exports as WebM (9:16). Upload to TikTok or convert to MP4 locally if needed.
      </p>
    </div>
  );
}
