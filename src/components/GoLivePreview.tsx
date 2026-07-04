"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MonitorPlay, Radio, WifiOff } from "lucide-react";
import { StreamPlayer } from "@/components/StreamPlayer";
import { RtmpCredentials } from "@/components/RtmpCredentials";
import { hlsManifestReady, resolveClientHlsPlaybackUrl } from "@/lib/hls-playback";
import { apiFetch } from "@/lib/fetch-client";

type PreviewStatus = "waiting" | "checking" | "ready" | "error";

type PreviewDiagnostics = {
  suggestion?: string | null;
  upstream?: { hint?: string; status: number };
  dbStream?: { status: string } | null;
};

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
  const [diagnostics, setDiagnostics] = useState<PreviewDiagnostics | null>(null);
  const previewPlaybackUrl = resolveClientHlsPlaybackUrl(ingestKey, playbackUrl, ingestMode);
  const isDemo = ingestMode === "demo";

  const pollPreview = useCallback(async () => {
    if (!previewPlaybackUrl || isDemo) return;
    setStatus((s) => (s === "ready" ? s : "checking"));
    const [ready, statusRes] = await Promise.all([
      hlsManifestReady(previewPlaybackUrl),
      apiFetch(`/api/rtmp/preview-status?ingestKey=${encodeURIComponent(ingestKey)}`).then((r) =>
        r.ok ? (r.json() as Promise<PreviewDiagnostics & { proxyReady?: boolean }>) : null,
      ),
    ]);
    if (statusRes) {
      setDiagnostics({
        suggestion: statusRes.suggestion,
        upstream: statusRes.upstream,
        dbStream: statusRes.dbStream,
      });
    }
    setChecks((n) => n + 1);
    setStatus(ready || statusRes?.proxyReady ? "ready" : "waiting");
  }, [previewPlaybackUrl, isDemo, ingestKey]);

  useEffect(() => {
    if (!previewPlaybackUrl || isDemo) return;
    void pollPreview();
    const interval = setInterval(() => {
      void pollPreview();
    }, 3000);
    return () => clearInterval(interval);
  }, [previewPlaybackUrl, isDemo, pollPreview]);

  const obsConnected = status === "ready" || isDemo;
  const canPublish = obsConnected;
  const showPlayer = obsConnected && previewPlaybackUrl;

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

      <RtmpCredentials rtmpUrl={rtmpUrl} ingestKey={ingestKey} demoMode={isDemo} />

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
                Cannot reach streaming server — check VPS / DNS
              </span>
            )}
          </li>
          <li className={obsConnected ? "text-[#53fc18]" : ""}>
            {obsConnected ? "✓" : "○"} OBS stream detected (HLS manifest)
          </li>
          <li className={showPlayer ? "text-zinc-300" : ""}>
            {showPlayer ? "✓" : "○"} Preview player {showPlayer ? "ready" : "waiting for signal"}
          </li>
        </ul>

        {isDemo && (
          <p className="text-xs text-amber-400/90 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            Demo mode shows a sample HLS feed. Connect real RTMP in production to preview your OBS output.
          </p>
        )}

        {!obsConnected && !isDemo && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-3 text-xs text-amber-100/90 space-y-2">
            <p className="font-semibold text-amber-200">
              OBS shows connected but LiveBooth can&apos;t see your feed yet
            </p>
            <ol className="list-decimal list-inside space-y-1 text-amber-100/80">
              <li>
                Click <strong>Stop Streaming</strong> in OBS, then paste the stream key again and{" "}
                <strong>Start Streaming</strong>
              </li>
              <li>
                Server must be exactly: <code className="text-amber-200/90">{rtmpUrl}</code>
              </li>
              <li>
                Stream key (only in the key field):{" "}
                <code className="font-mono text-amber-200/90">{ingestKey}</code>
              </li>
              <li>Do not put the stream key in the server URL</li>
              <li>Check OBS shows a bitrate number (e.g. 2500 kbps), not just &quot;Connected&quot;</li>
            </ol>
            {diagnostics?.suggestion && (
              <p className="rounded-md bg-black/30 border border-amber-500/20 px-2.5 py-2 text-amber-100">
                {diagnostics.suggestion}
              </p>
            )}
            {diagnostics?.upstream?.hint && (
              <p className="text-[10px] text-amber-200/60 font-mono">{diagnostics.upstream.hint}</p>
            )}
          </div>
        )}

        {showPlayer ? (
          <StreamPlayer
            key={ingestKey}
            djName={djName}
            streamTitle={title}
            viewers={0}
            playbackUrl={previewPlaybackUrl}
            isLive
            previewMode
            demoPlayback={isDemo}
          />
        ) : (
          <div className="aspect-video rounded-lg bg-black/70 border border-white/5 flex flex-col items-center justify-center gap-3 text-center px-6">
            <Radio className="h-10 w-10 text-zinc-600" />
            <p className="text-sm text-zinc-400">Preview player loads when OBS signal is detected</p>
            {!isDemo && checks > 2 && (
              <p className="text-[11px] text-zinc-600">
                Still waiting… double-check the stream key in OBS matches above.
              </p>
            )}
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
