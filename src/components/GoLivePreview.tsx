"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Loader2,
  MonitorPlay,
  Radio,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { StreamPlayer } from "@/components/StreamPlayer";
import { RtmpCredentials } from "@/components/RtmpCredentials";
import { hlsManifestReady, resolveClientHlsPlaybackUrl } from "@/lib/hls-playback";
import { apiFetch } from "@/lib/fetch-client";
import { DJ_OBS_DISCONNECT_LOOP_TIPS } from "@/lib/guidance";

type PreviewStatus = "waiting" | "checking" | "ready" | "error";

type PreviewDiagnostics = {
  suggestion?: string | null;
  upstream?: { hint?: string; status: number };
  dbStream?: { status: string } | null;
  rtmpAuthAllowed?: boolean;
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

function StatusPill({
  label,
  state,
}: {
  label: string;
  state: "ready" | "waiting" | "error" | "checking";
}) {
  const styles = {
    ready: "border-[#53fc18]/30 bg-[#53fc18]/10 text-[#53fc18]",
    waiting: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    error: "border-red-500/30 bg-red-500/10 text-red-300",
    checking: "border-white/10 bg-white/5 text-zinc-400",
  }[state];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${styles}`}
    >
      {state === "ready" && <CheckCircle2 className="h-3 w-3" />}
      {state === "waiting" && <WifiOff className="h-3 w-3" />}
      {state === "checking" && <Loader2 className="h-3 w-3 animate-spin" />}
      {label}
    </span>
  );
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
        rtmpAuthAllowed: statusRes.rtmpAuthAllowed,
      });
    }
    setChecks((n) => n + 1);
    const signalReady = Boolean(statusRes?.proxyReady || ready);
    setStatus(signalReady ? "ready" : "waiting");
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
  const serverState =
    rtmpOnline === false ? "error" : rtmpOnline === true ? "ready" : checks > 0 ? "checking" : "waiting";
  const obsState = obsConnected ? "ready" : status === "checking" ? "checking" : "waiting";
  const playerState = showPlayer ? "ready" : obsConnected ? "checking" : "waiting";
  const showHelp =
    !obsConnected &&
    !isDemo &&
    (checks > 1 || rtmpOnline === false || diagnostics?.rtmpAuthAllowed === false);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#15CFF4]/25 bg-[#15CFF4]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#15CFF4]">
          <MonitorPlay className="h-3.5 w-3.5" />
          Private preview
        </span>
        <h2 className="text-2xl font-bold mt-4">{title}</h2>
        <p className="text-sm text-zinc-400 mt-2 max-w-sm mx-auto">
          Paste credentials into OBS, start streaming, then check your picture and sound before going live.
        </p>
      </div>

      <RtmpCredentials rtmpUrl={rtmpUrl} ingestKey={ingestKey} demoMode={isDemo} />

      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
          <p className="text-xs font-medium text-zinc-400">Connection status</p>
          <div className="flex flex-wrap gap-2">
            <StatusPill
              label={rtmpOnline === false ? "Server offline" : "Server ready"}
              state={serverState}
            />
            <StatusPill
              label={obsConnected ? "OBS connected" : "Waiting for OBS"}
              state={obsState}
            />
            <StatusPill
              label={showPlayer ? "Preview ready" : "Preview pending"}
              state={playerState}
            />
          </div>
        </div>

        {showPlayer ? (
          <div className="p-3">
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
          </div>
        ) : (
          <div className="aspect-video flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-black/40">
              {status === "checking" ? (
                <Loader2 className="h-8 w-8 text-[#15CFF4] animate-spin" />
              ) : (
                <Radio className="h-8 w-8 text-zinc-600" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300">
                {status === "checking" ? "Checking your feed…" : "Preview loads when OBS connects"}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Start streaming in OBS — this usually takes a few seconds.
              </p>
            </div>
          </div>
        )}
      </div>

      {isDemo && (
        <p className="text-xs text-amber-300/90 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          Demo mode uses a sample feed. Connect real RTMP in production to preview your OBS output.
        </p>
      )}

      {showHelp && (
        <details className="group rounded-xl border border-white/10 bg-white/[0.02] open:bg-white/[0.03]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white">
            <span className="inline-flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-zinc-500" />
              Having trouble connecting?
            </span>
            <ChevronDown className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-white/5 px-4 py-4 space-y-4 text-xs text-zinc-400">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Click <strong className="text-zinc-300">Stop Streaming</strong> in OBS, re-paste the stream key,
                then <strong className="text-zinc-300">Start Streaming</strong>
              </li>
              <li>
                Server: <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-zinc-300">{rtmpUrl}</code>
              </li>
              <li>
                Stream key (key field only):{" "}
                <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-zinc-300">{ingestKey}</code>
              </li>
              <li>Confirm OBS shows a bitrate (e.g. 2500 kbps), not just &quot;Connected&quot;</li>
            </ol>

            {diagnostics?.rtmpAuthAllowed === false && (
              <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-red-200">
                This stream key was rejected — generate a new key below and update OBS.
              </p>
            )}
            {diagnostics?.suggestion && (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-amber-100">
                {diagnostics.suggestion}
              </p>
            )}
            {diagnostics?.upstream?.hint && (
              <p className="font-mono text-[10px] text-zinc-500">{diagnostics.upstream.hint}</p>
            )}

            <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-3 space-y-2">
              <p className="font-semibold text-zinc-300">OBS keeps disconnecting?</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-500">
                {DJ_OBS_DISCONNECT_LOOP_TIPS.slice(0, 4).map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      )}

      <div className="space-y-3 pt-1">
        <button
          type="button"
          onClick={onPublish}
          disabled={publishing || !canPublish}
          className="w-full rounded-xl bg-gradient-to-r from-[#53fc18] to-[#15CFF4] py-3.5 text-sm font-bold text-black shadow-lg shadow-[#53fc18]/10 disabled:opacity-40 disabled:shadow-none transition-opacity"
        >
          {publishing ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Publishing…
            </span>
          ) : obsConnected ? (
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Go live — notify fans
            </span>
          ) : (
            "Waiting for OBS signal…"
          )}
        </button>
        {!canPublish && (
          <p className="text-[11px] text-center text-zinc-600">
            Fans won&apos;t see you until you publish. Cancel below to discard this setup.
          </p>
        )}
      </div>
    </div>
  );
}
