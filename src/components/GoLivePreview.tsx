"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MonitorPlay, Radio, WifiOff } from "lucide-react";
import { StreamPlayer } from "@/components/StreamPlayer";
import { RtmpCredentials } from "@/components/RtmpCredentials";
import { resolveClientHlsPlaybackUrl } from "@/lib/hls-playback";

type PreviewStatus = "waiting" | "checking" | "ready" | "error";

type GoLivePreviewProps = {
  title: string;
  djName: string;
  playbackUrl: string;
  rtmpUrl: string;
  ingestKey: string;
  ingestMode?: "livepeer" | "local" | "demo";
  rtmpOnline?: boolean | null;
  onPublish: () => void;
  publishing?: boolean;
};

async function hlsManifestReady(url: string, depth = 0): Promise<boolean> {
  if (depth > 2) return false;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;
    const text = await res.text();
    if (text.includes("#EXT-X-STREAM-INF")) {
      const match = text.match(/URI="([^"]+)"/);
      if (match?.[1]) {
        return hlsManifestReady(new URL(match[1], url).href, depth + 1);
      }
    }
    return /#EXTINF:[\d.]+/.test(text);
  } catch {
    return false;
  }
}

export function GoLivePreview({
  title,
  djName,
  playbackUrl,
  rtmpUrl,
  ingestKey,
  ingestMode,
  rtmpOnline,
  onPublish,
  publishing = false,
}: GoLivePreviewProps) {
  const [status, setStatus] = useState<PreviewStatus>("waiting");
  const [checks, setChecks] = useState(0);
  const previewPlaybackUrl = resolveClientHlsPlaybackUrl(ingestKey, playbackUrl, ingestMode);

  const pollPreview = useCallback(async () => {
    if (!previewPlaybackUrl) return;
    setStatus((s) => (s === "ready" ? s : "checking"));
    const ready = await hlsManifestReady(previewPlaybackUrl);
    setChecks((n) => n + 1);
    setStatus(ready ? "ready" : "waiting");
  }, [previewPlaybackUrl]);

  useEffect(() => {
    if (!previewPlaybackUrl || ingestMode === "demo") return;
    void pollPreview();
    const interval = setInterval(() => {
      void pollPreview();
    }, 3000);
    return () => clearInterval(interval);
  }, [previewPlaybackUrl, ingestMode, pollPreview]);

  const obsConnected = status === "ready";
  const canPublish = obsConnected || ingestMode === "demo";

  return (
    <div className="space-y-5">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#15CFF4]/15 border border-[#15CFF4]/30 px-3 py-1 text-xs font-bold text-[#15CFF4] uppercase">
          <MonitorPlay className="h-3 w-3" /> Preview mode
        </span>
        <h2 className="text-xl font-bold mt-3">{title}</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Fans can&apos;t see you yet — check video and audio, then go live.
        </p>
      </div>

      <RtmpCredentials rtmpUrl={rtmpUrl} ingestKey={ingestKey} demoMode={ingestMode === "demo"} />

      <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-zinc-400">Preview checks</span>
          {status === "checking" ? (
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking feed…
            </span>
          ) : obsConnected ? (
            <span className="inline-flex items-center gap-1.5 text-[#53fc18] font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" /> Signal detected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-300">
              <WifiOff className="h-3.5 w-3.5" /> Waiting for OBS…
            </span>
          )}
        </div>

        <ul className="space-y-1.5 text-xs text-zinc-500">
          <li className={rtmpOnline !== false ? "text-zinc-300" : "text-red-300"}>
            {rtmpOnline !== false ? "✓" : "✗"} HLS server reachable
            {rtmpOnline === false && (
              <span className="block text-[10px] text-red-300/80 mt-0.5">
                Cannot reach {ingestMode === "local" ? "streaming server" : "ingest"} — check VPS / DNS
              </span>
            )}
          </li>
          <li className={obsConnected ? "text-[#53fc18]" : ""}>
            {obsConnected ? "✓" : "○"} OBS stream detected (HLS manifest)
          </li>
          <li>{checks > 0 ? "✓" : "○"} Preview player below</li>
        </ul>

        {ingestMode === "demo" && (
          <p className="text-xs text-amber-400/90 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            Demo mode shows a sample HLS feed. Connect real RTMP in production to preview your OBS output.
          </p>
        )}

        {!obsConnected && ingestMode !== "demo" && (
          <p className="text-xs text-zinc-400">
            Start streaming in OBS with the credentials above. Update the stream key in OBS if you
            started a new session — this page polls{" "}
            <code className="text-zinc-500">{previewPlaybackUrl || "…"}</code> every few seconds.
          </p>
        )}

        {previewPlaybackUrl ? (
          <StreamPlayer
            djName={djName}
            streamTitle={title}
            viewers={0}
            playbackUrl={previewPlaybackUrl}
            isLive
            previewMode
            demoPlayback={ingestMode === "demo"}
          />
        ) : (
          <div className="aspect-video rounded-lg bg-black/60 flex items-center justify-center text-sm text-zinc-500">
            No preview URL
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onPublish}
        disabled={publishing || !canPublish}
        className="w-full rounded-lg bg-gradient-to-r from-[#53fc18] to-[#15CFF4] py-3 text-sm font-bold text-black disabled:opacity-40"
      >
        {publishing ? "Publishing…" : obsConnected ? "Looks good — go live" : "Waiting for OBS signal…"}
      </button>

      {!canPublish && (
        <p className="text-[11px] text-center text-zinc-600">
          Preview must detect your OBS feed before going live. Cancel setup above to discard without publishing.
        </p>
      )}
    </div>
  );
}
