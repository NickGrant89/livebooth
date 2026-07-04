"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";
import {
  createMediaMtxHlsConfig,
  isProxiedMediaMtxHls,
  preferNativeMediaMtxHls,
  resolveClientHlsPlaybackUrl,
} from "@/lib/hls-playback";

type Props = {
  playbackUrl: string;
  ingestKey?: string | null;
  partnerName: string;
};

export function CollabPartnerPip({ playbackUrl, ingestKey, partnerName }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resolved = resolveClientHlsPlaybackUrl(ingestKey, playbackUrl);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolved) return;

    const mediaMtx = isProxiedMediaMtxHls(resolved);

    if (mediaMtx && preferNativeMediaMtxHls()) {
      video.src = resolved;
      video.load();
      video.play().catch(() => undefined);
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    if (Hls.isSupported()) {
      const hls = new Hls(mediaMtx ? createMediaMtxHlsConfig() : { enableWorker: true });
      hls.loadSource(resolved);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => undefined);
      });
      return () => hls.destroy();
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = resolved;
      video.play().catch(() => undefined);
    }
  }, [resolved, playbackUrl]);

  return (
    <div className="absolute bottom-14 sm:bottom-16 right-2 sm:right-3 z-30 w-[32%] min-w-[100px] max-w-[220px] aspect-video rounded-lg border-2 border-[#53fc18]/60 overflow-hidden shadow-xl bg-black">
      <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
      <span className="absolute bottom-1 left-1 right-1 truncate text-[9px] font-bold uppercase tracking-wide bg-black/75 px-1.5 py-0.5 rounded text-[#53fc18]">
        {partnerName}
      </span>
    </div>
  );
}
