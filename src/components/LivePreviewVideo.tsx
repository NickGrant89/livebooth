"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { createMediaMtxHlsConfig, isProxiedMediaMtxHls, playbackUrlForThisDevice } from "@/lib/hls-playback";

/** Muted live picture for the Discover hero. */
export function LivePreviewVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    const playUrl = playbackUrlForThisDevice(src);

    if (playUrl.startsWith("/api/hls/") || !Hls.isSupported()) {
      video.src = playUrl;
      video.play().catch(() => undefined);
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    if (isProxiedMediaMtxHls(playUrl) && Hls.isSupported()) {
      const hls = new Hls(createMediaMtxHlsConfig());
      hls.loadSource(playUrl);
      hls.attachMedia(video);
      const play = () => {
        video.play().catch(() => undefined);
      };
      hls.on(Hls.Events.MANIFEST_PARSED, play);
      return () => hls.destroy();
    }

    video.src = playUrl;
    video.play().catch(() => undefined);
    return () => {
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  return (
    <video
      ref={ref}
      muted
      autoPlay
      playsInline
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
    />
  );
}
