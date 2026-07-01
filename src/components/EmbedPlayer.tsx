"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import Link from "next/link";
import { Radio, Volume2, VolumeX } from "lucide-react";

interface EmbedPlayerProps {
  stationName: string;
  stationSlug: string;
  avatar: string;
  primaryColor: string;
  hideBranding: boolean;
  playbackUrl?: string | null;
  streamTitle?: string;
  djName?: string;
  djUsername?: string;
  isLive: boolean;
  relayUrl?: string | null;
}

export function EmbedPlayer({
  stationName,
  stationSlug,
  avatar,
  primaryColor,
  hideBranding,
  playbackUrl,
  streamTitle,
  djName,
  djUsername,
  isLive,
  relayUrl,
}: EmbedPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const url = playbackUrl ?? (relayUrl && !isLive ? relayUrl : null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    if (Hls.isSupported() && url.includes(".m3u8")) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
    }
  }, [url]);

  return (
    <div
      className="min-h-[420px] flex flex-col bg-[#0a0a0c] text-white"
      style={{ "--embed-accent": primaryColor } as React.CSSProperties}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-black"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)` }}
        >
          {avatar || stationName.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{stationName}</p>
          {isLive && streamTitle ? (
            <p className="text-[11px] text-zinc-400 truncate">
              {streamTitle}
              {djName ? ` · ${djName}` : ""}
            </p>
          ) : (
            <p className="text-[11px] text-zinc-500">Off air</p>
          )}
        </div>
        {isLive && (
          <span
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase text-black"
            style={{ backgroundColor: primaryColor }}
          >
            <Radio className="h-3 w-3" />
            Live
          </span>
        )}
      </div>

      <div className="relative flex-1 bg-black min-h-[280px]">
        {url ? (
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
                onClick={() => {
                  setMuted(false);
                  videoRef.current?.play().catch(() => undefined);
                }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 hover:bg-black/40"
              >
                <VolumeX className="h-8 w-8 mb-2" />
                <span className="text-xs font-semibold">Tap to unmute</span>
              </button>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm">
            No signal — check back when a show is live
          </div>
        )}

        <div className="absolute bottom-0 inset-x-0 flex items-center gap-2 bg-black/70 px-3 py-2">
          <button type="button" onClick={() => setMuted((m) => !m)} className="text-zinc-400">
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          {isLive && djUsername && (
            <Link
              href={`/stream/${djUsername}`}
              target="_blank"
              className="ml-auto text-[11px] font-semibold hover:underline"
              style={{ color: primaryColor }}
            >
              Open full booth →
            </Link>
          )}
        </div>
      </div>

      {!hideBranding && (
        <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-600">
          <Link href={`/station/${stationSlug}`} target="_blank" className="hover:text-zinc-400">
            {stationName}
          </Link>
          <Link href="/" target="_blank" className="hover:text-zinc-400">
            Powered by LiveBooth
          </Link>
        </div>
      )}
    </div>
  );
}
