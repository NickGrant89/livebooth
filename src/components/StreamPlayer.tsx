"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Link from "next/link";
import Hls from "hls.js";
import { Disc3, Radio, Users, Volume2, VolumeX } from "lucide-react";

export interface StreamPlayerHandle {
  seekTo: (seconds: number) => void;
  getVideoElement: () => HTMLVideoElement | null;
}

interface StreamPlayerProps {
  djName: string;
  streamTitle: string;
  viewers: number;
  playbackUrl?: string | null;
  isLive: boolean;
  startedAt?: string | null;
  demoPlayback?: boolean;
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
    viewerLabel = "live",
    peakViewers,
    station,
  },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useImperativeHandle(ref, () => ({
    seekTo(seconds: number) {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = seconds;
      video.play().catch(() => undefined);
      setMuted(false);
    },
    getVideoElement() {
      return videoRef.current;
    },
  }));

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

    const isFile =
      playbackUrl.includes("/api/vod/file/") ||
      /\.(mp4|fmp4|webm)(\?|$)/i.test(playbackUrl);

    if (isFile) {
      video.src = playbackUrl.startsWith("/")
        ? `${window.location.origin}${playbackUrl}`
        : playbackUrl;
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) console.error("[hls]", data.type, data.details, playbackUrl);
      });
      return () => hls.destroy();
    }
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playbackUrl;
    }
  }, [playbackUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

  function unmute() {
    setMuted(false);
    videoRef.current?.play().catch(() => undefined);
  }

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const timeStr = `${hours > 0 ? `${hours}:` : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="relative overflow-hidden rounded-none sm:rounded-xl border-0 sm:border border-white/5 bg-black aspect-video w-full max-w-full">
      {playbackUrl ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted={muted}
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
          {muted && (
            <button
              type="button"
              onClick={unmute}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] hover:bg-black/50 transition-colors"
            >
              <VolumeX className="h-10 w-10 text-white mb-2" />
              <span className="text-sm font-semibold text-white">Click to unmute</span>
            </button>
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

      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-4 z-10 pb-12">
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

      <div className="absolute bottom-0 inset-x-0 flex items-center gap-3 bg-black/80 px-4 py-2 backdrop-blur-sm z-10">
        <button type="button" onClick={() => setMuted((m) => !m)} className="text-zinc-400 hover:text-white">
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-24 accent-[#53fc18]"
        />
        <span className="text-[10px] text-zinc-600 uppercase ml-auto">
          {demoPlayback ? "Demo HLS" : playbackUrl?.includes("/api/vod/file/") ? "Recording" : playbackUrl ? "HLS Stream" : "No signal"}
        </span>
      </div>
    </div>
  );
});
