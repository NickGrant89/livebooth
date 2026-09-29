"use client";

import { useState } from "react";
import { Film, Loader2, Share2, Smartphone } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";
import { downloadBlob, shareClipBlob } from "@/lib/clip-export";

type ServerClipPanelProps = {
  streamId: string;
  mode: "live_tail" | "vod";
  startSec?: number;
  title: string;
  djUsername: string;
  compact?: boolean;
};

export function ServerClipPanel({
  streamId,
  mode,
  startSec = 0,
  title,
  djUsername,
  compact = false,
}: ServerClipPanelProps) {
  const [duration, setDuration] = useState<30 | 60>(30);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [lastDownloadUrl, setLastDownloadUrl] = useState<string | null>(null);

  async function exportMp4() {
    setError("");
    setExporting(true);
    try {
      const res = await apiFetch(`/api/streams/${streamId}/clip`, {
        method: "POST",
        body: JSON.stringify({
          durationSec: duration,
          mode,
          startSec: mode === "vod" ? startSec : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not export clip");
        return;
      }
      const downloadUrl = data.downloadUrl as string;
      const filename = (data.filename as string) || "livebooth-clip.mp4";
      setLastDownloadUrl(downloadUrl);

      const shareText = `@${djUsername} — ${title} · LiveBooth clip`;

      const fileRes = await apiFetch(downloadUrl);
      if (!fileRes.ok) {
        setError("Clip rendered but download failed — use Download again");
        return;
      }
      const blob = await fileRes.blob();
      const mp4 =
        blob.type === "video/mp4"
          ? blob
          : new Blob([blob], { type: "video/mp4" });

      try {
        await shareClipBlob(mp4, filename, shareText);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        downloadBlob(mp4, filename);
      }
    } catch {
      setError("Clip export failed — try again in a moment");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-purple-500/25 bg-purple-500/5 p-3 space-y-3"
          : "rounded-xl border border-purple-500/25 bg-purple-500/5 p-4 space-y-3"
      }
    >
      <div className="flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-purple-300" />
        <h3 className="font-semibold text-sm text-purple-100">
          {mode === "live_tail" ? "Clip this moment (live)" : "TikTok-ready MP4"}
        </h3>
      </div>
      <p className="text-xs text-zinc-500">
        {mode === "live_tail"
          ? "9:16 vertical clip from your OBS feed — full wide scene with letterbox bars (not a center zoom). MP4 for TikTok & Reels."
          : "Server-rendered 9:16 MP4 — full frame letterboxed for wide sets."}
      </p>

      <div className="flex flex-wrap gap-2">
        {([30, 60] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDuration(d)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              duration === d
                ? "bg-purple-500/25 text-purple-200 border border-purple-400/40"
                : "bg-white/5 text-zinc-400 border border-transparent"
            }`}
          >
            {mode === "live_tail" ? `Last ${d}s` : `${d}s`}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void exportMp4()}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
          {exporting ? "Rendering…" : "Export MP4"}
        </button>
        {lastDownloadUrl && (
          <a
            href={lastDownloadUrl}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
          >
            <Share2 className="h-4 w-4" />
            Download again
          </a>
        )}
      </div>
      {exporting && (
        <p className="text-[10px] text-zinc-500">ffmpeg on the streaming server — usually 10–40 seconds.</p>
      )}
    </div>
  );
}
