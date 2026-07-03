"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Link from "next/link";
import Hls from "hls.js";
import { Disc3, FastForward, Radio, Rewind, Users, Volume2, VolumeX } from "lucide-react";
import {
  ensureVideoExportReady,
  playbackNeedsCrossOrigin,
  resolvePlaybackUrl,
} from "@/lib/video-cors";

const VOD_SKIP_SECONDS = 10;
const VOD_PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2] as const;

function formatMediaTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export interface StreamPlayerHandle {
  seekTo: (seconds: number) => void;
  getVideoElement: () => HTMLVideoElement | null;
  /** Reload with CORS if needed so clip export works without a page refresh. */
  ensureExportReady: () => Promise<void>;
}

interface StreamPlayerProps {
  djName: string;
  streamTitle: string;
  viewers: number;
  playbackUrl?: string | null;
  isLive: boolean;
  startedAt?: string | null;
  demoPlayback?: boolean;
  /** Go-live preview — clearer copy and wait for HLS frames before unmute prompt */
  previewMode?: boolean;
  viewerLabel?: "live" | "peak";
  peakViewers?: number;
  station?: { slug: string; name: string; avatar: string } | null;
}

export const StreamPlayer = forwardRef<StreamPlayerHandle, StreamPlayerProps>(function StreamPlayer(
  {
  djName,
  streamTitle,
  viewers,
  playbackUrl,
  isLive,
  startedAt,
    demoPlayback = false,
    previewMode = false,
    viewerLabel = "live",
    peakViewers,
    station,
  },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsManifestReadyRef = useRef(false);
  const vodReadyRef = useRef(false);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const isScrubbingRef = useRef(false);
  const progressRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    seekTo(seconds: number) {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = seconds;
      setCurrentTime(seconds);
      video.play().catch(() => undefined);
      setMuted(false);
    },
    getVideoElement() {
      return videoRef.current;
    },
    async ensureExportReady() {
      const video = videoRef.current;
      if (!video || !playbackUrl) {
        throw new Error("Player not ready — wait for the replay to load.");
      }
      await ensureVideoExportReady(video, playbackUrl);
    },
  }), [playbackUrl]);

  useEffect(() => {
    if (!startedAt || !isLive) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, isLive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    hlsManifestReadyRef.current = false;
    vodReadyRef.current = false;
    setPlaybackError(false);
    setIsLoading(!isLive && !previewMode);

    const isFile =
      playbackUrl.includes("/api/vod/file/") ||
      /\.(mp4|fmp4|webm)(\?|$)/i.test(playbackUrl);

    if (isFile) {
      const src = resolvePlaybackUrl(playbackUrl);
      video.removeAttribute("crossorigin");

      const markReady = () => {
        vodReadyRef.current = true;
        setIsLoading(false);
        setPlaybackError(false);
      };

      const onError = () => {
        setPlaybackError(true);
        setIsLoading(false);
      };
      const onLoaded = () => {
        markReady();
        video.playbackRate = playbackSpeed;
        video.play().catch(() => undefined);
      };
      const onCanPlay = () => markReady();
      const onWaiting = () => {
        if (!vodReadyRef.current) setIsLoading(true);
      };
      const onPlaying = () => markReady();

      video.addEventListener("error", onError);
      video.addEventListener("loadeddata", onLoaded);
      video.addEventListener("canplay", onCanPlay);
      video.addEventListener("waiting", onWaiting);
      video.addEventListener("playing", onPlaying);
      video.preload = "auto";
      video.playsInline = true;
      video.src = src;
      video.load();

      const loadTimeout = window.setTimeout(() => {
        if (!vodReadyRef.current && video.readyState < 2) {
          setPlaybackError(true);
          setIsLoading(false);
        }
      }, 25000);

      return () => {
        window.clearTimeout(loadTimeout);
        video.removeEventListener("error", onError);
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("playing", onPlaying);
        video.removeAttribute("src");
        video.load();
      };
    }

    if (Hls.isSupported()) {
      setIsLoading(!previewMode);
      const liveLike = isLive || previewMode;
      const hls = new Hls({
        enableWorker: true,
        // MediaMTX remuxed HLS is more reliable without LL-HLS mode in browsers.
        lowLatencyMode: false,
        backBufferLength: liveLike ? 30 : 90,
        liveSyncDurationCount: 3,
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 8,
      });
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);

      const clearLoading = () => {
        setIsLoading(false);
        setPlaybackError(false);
      };

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        hlsManifestReadyRef.current = true;
        clearLoading();
        video.play().catch(() => undefined);
      });
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (video.readyState >= 2) clearLoading();
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        console.error("[hls]", data.type, data.details, playbackUrl);
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          return;
        }
        setPlaybackError(true);
        setIsLoading(false);
      });

      const onPlaying = () => clearLoading();
      const onCanPlay = () => clearLoading();
      const onWaiting = () => {
        if (previewMode || hlsManifestReadyRef.current) return;
        if (video.readyState < 3) setIsLoading(true);
      };

      video.addEventListener("playing", onPlaying);
      video.addEventListener("canplay", onCanPlay);
      video.addEventListener("waiting", onWaiting);

      const nativeFallback = window.setTimeout(() => {
        if (previewMode && video.readyState < 2) {
          hls.destroy();
          video.src = playbackUrl;
          video.play().catch(() => undefined);
        }
      }, 10000);

      return () => {
        window.clearTimeout(nativeFallback);
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("waiting", onWaiting);
        hls.destroy();
      };
    }
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      setIsLoading(true);
      video.src = playbackUrl;
      video.addEventListener(
        "loadedmetadata",
        () => {
          setIsLoading(false);
          video.play().catch(() => undefined);
        },
        { once: true },
      );
    }
  }, [playbackUrl, isLive, previewMode]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || isLive || previewMode) return;

    const syncDuration = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
    };
    const onTimeUpdate = () => {
      if (!isScrubbingRef.current) setCurrentTime(video.currentTime);
    };

    syncDuration();
    video.addEventListener("loadedmetadata", syncDuration);
    video.addEventListener("durationchange", syncDuration);
    video.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      video.removeEventListener("loadedmetadata", syncDuration);
      video.removeEventListener("durationchange", syncDuration);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [playbackUrl, isLive, previewMode]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [playbackUrl]);

  function unmute() {
    setMuted(false);
    videoRef.current?.play().catch(() => undefined);
  }

  function skip(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    const max = Number.isFinite(video.duration) ? video.duration : undefined;
    const next = video.currentTime + seconds;
    const target = max != null ? Math.min(Math.max(0, next), max) : Math.max(0, next);
    video.currentTime = target;
    setCurrentTime(target);
    video.play().catch(() => undefined);
    setMuted(false);
  }

  function seekToRatio(ratio: number) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const target = ratio * video.duration;
    video.currentTime = target;
    setCurrentTime(target);
    video.play().catch(() => undefined);
    setMuted(false);
  }

  function handleProgressPointer(clientX: number) {
    const bar = progressRef.current;
    if (!bar || duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    seekToRatio(ratio);
  }

  function cyclePlaybackSpeed() {
    setPlaybackSpeed((current) => {
      const index = VOD_PLAYBACK_SPEEDS.indexOf(current as (typeof VOD_PLAYBACK_SPEEDS)[number]);
      const next = VOD_PLAYBACK_SPEEDS[(index + 1) % VOD_PLAYBACK_SPEEDS.length]!;
      return next;
    });
  }

  const speedLabel = playbackSpeed === 1 ? "1x" : `${playbackSpeed}x`;
  const showSeekBar = !isLive && !previewMode && duration > 0;
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  /** Clip export reloads with crossOrigin when needed — don't set it during normal playback (breaks iOS replay). */
  const useCrossOrigin = false;

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const timeStr = `${hours > 0 ? `${hours}:` : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="relative overflow-hidden rounded-none sm:rounded-xl border-0 sm:border border-white/5 bg-black aspect-video w-full max-w-full">
      {playbackUrl ? (
        <>
          <video
            key={playbackUrl ?? "idle"}
            ref={videoRef}
            autoPlay
            muted={muted}
            playsInline
            crossOrigin={useCrossOrigin ? "anonymous" : undefined}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {isLoading && !playbackError && !previewMode && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[1px]">
              <Disc3 className="h-10 w-10 text-[#53fc18]/80 animate-spin" style={{ animationDuration: "2s" }} />
              <span className="mt-3 text-xs font-medium text-zinc-300">
                {isLive ? "Connecting stream…" : "Loading replay…"}
              </span>
            </div>
          )}
          {previewMode && isLoading && !playbackError && (
            <div className="absolute top-3 left-3 z-10 rounded-md bg-black/70 px-2 py-1 text-[10px] text-zinc-300 backdrop-blur-sm">
              Buffering preview…
            </div>
          )}
          {muted && !playbackError && (!isLive || previewMode || !isLoading) && (
            <button
              type="button"
              onClick={unmute}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] hover:bg-black/50 transition-colors"
            >
              <VolumeX className="h-10 w-10 text-white mb-2" />
              <span className="text-sm font-semibold text-white">
                {previewMode
                  ? "Click to preview with sound"
                  : !isLive
                    ? "Tap to play replay"
                    : "Click to unmute"}
              </span>
            </button>
          )}
          {playbackError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 px-6 text-center">
              <p className="text-sm font-semibold text-white">
                {previewMode || isLive ? "Preview could not load" : "Recording could not play"}
              </p>
              <p className="mt-2 text-xs text-zinc-400">
                {previewMode || isLive
                  ? "Check OBS is streaming and your stream key matches. Refresh if it should be working."
                  : "The file may still be processing on the server. Wait a minute and refresh."}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#12121a] to-[#0a1628]">
          <Disc3 className="h-32 w-32 text-[#53fc18]/60 animate-spin" style={{ animationDuration: "3s" }} />
        </div>
      )}

      {demoPlayback && (
        <div className="absolute top-14 left-4 z-10 rounded-md bg-amber-500/90 px-2.5 py-1 text-[10px] font-bold uppercase text-black">
          Demo stream — connect OBS for your feed
        </div>
      )}

      {isLive && (
        <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
          <span className="flex items-center gap-1.5 rounded-md bg-red-500 px-2.5 py-1 text-xs font-bold uppercase">
            <Radio className="h-3 w-3 animate-pulse" />
            Live
          </span>
          <span className="rounded-md bg-black/60 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
            {timeStr}
          </span>
        </div>
      )}

      <div className="absolute top-4 right-4 flex flex-col items-end gap-1 z-10">
        {isLive ? (
          <>
            <span className="flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
              <Users className="h-3 w-3" />
              {viewers.toLocaleString()} watching
            </span>
            {peakViewers != null && peakViewers > viewers && (
              <span className="rounded-md bg-black/40 px-2 py-0.5 text-[10px] text-zinc-400 backdrop-blur-sm">
                {peakViewers.toLocaleString()} peak
              </span>
            )}
          </>
        ) : (
          <span className="flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
            <Users className="h-3 w-3" />
            {viewers.toLocaleString()} {viewerLabel === "peak" ? "peak" : "watching"}
          </span>
        )}
      </div>

      <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-4 z-10 ${showSeekBar ? "pb-24" : "pb-12"}`}>
        {station && (
          <Link
            href={`/station/${station.slug}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#53fc18]/15 border border-[#53fc18]/30 px-2 py-0.5 text-[10px] font-bold uppercase text-[#53fc18] mb-2 hover:bg-[#53fc18]/25 transition-colors"
          >
            Presented by {station.name}
          </Link>
        )}
        <h2 className="text-lg font-bold text-white">{streamTitle}</h2>
        <p className="text-sm text-zinc-400">{djName}</p>
      </div>

      {showSeekBar && (
        <div className="absolute bottom-10 inset-x-0 z-10 px-3 sm:px-4">
          <div
            ref={progressRef}
            className="group relative h-2 cursor-pointer rounded-full bg-white/15 touch-none"
            onClick={(e) => handleProgressPointer(e.clientX)}
            onPointerDown={(e) => {
              isScrubbingRef.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              handleProgressPointer(e.clientX);
            }}
            onPointerMove={(e) => {
              if (!isScrubbingRef.current) return;
              handleProgressPointer(e.clientX);
            }}
            onPointerUp={(e) => {
              isScrubbingRef.current = false;
              e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerCancel={() => {
              isScrubbingRef.current = false;
            }}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[#53fc18]"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-[#53fc18] opacity-0 shadow transition-opacity group-hover:opacity-100"
              style={{ left: `calc(${progressPercent}% - 7px)` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-mono text-zinc-400 tabular-nums">
            <span>{formatMediaTime(currentTime)}</span>
            <span>{formatMediaTime(duration)}</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 flex items-center gap-2 sm:gap-3 bg-black/80 px-3 sm:px-4 py-2 backdrop-blur-sm z-10">
        <button type="button" onClick={() => setMuted((m) => !m)} className="text-zinc-400 hover:text-white">
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-20 sm:w-24 accent-[#53fc18]"
        />
        {!isLive && playbackUrl && (
          <>
            <button
              type="button"
              onClick={() => skip(-VOD_SKIP_SECONDS)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-zinc-300 hover:bg-white/10 hover:text-white"
              aria-label={`Rewind ${VOD_SKIP_SECONDS} seconds`}
            >
              <Rewind className="h-3.5 w-3.5" />
              <span>{VOD_SKIP_SECONDS}s</span>
            </button>
            <button
              type="button"
              onClick={() => skip(VOD_SKIP_SECONDS)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-zinc-300 hover:bg-white/10 hover:text-white"
              aria-label={`Fast forward ${VOD_SKIP_SECONDS} seconds`}
            >
              <FastForward className="h-3.5 w-3.5" />
              <span>{VOD_SKIP_SECONDS}s</span>
            </button>
            <button
              type="button"
              onClick={cyclePlaybackSpeed}
              className="rounded-md px-2 py-1 text-[10px] font-bold text-[#53fc18] hover:bg-[#53fc18]/10"
              aria-label="Change playback speed"
            >
              {speedLabel}
            </button>
          </>
        )}
        <span className="text-[10px] text-zinc-600 uppercase ml-auto shrink-0">
          {demoPlayback ? "Demo HLS" : playbackUrl?.includes("/api/vod/file/") ? "Recording" : playbackUrl ? "HLS Stream" : "No signal"}
        </span>
      </div>
    </div>
  );
});
