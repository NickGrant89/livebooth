/** Same-origin HLS path for local lb_ ingest keys (browser + preview polling). */
export function localHlsPlaybackPath(ingestKey: string): string {
  return `/api/hls/live/${encodeURIComponent(ingestKey)}/index.m3u8`;
}

export function resolveClientHlsPlaybackUrl(
  ingestKey: string | null | undefined,
  playbackUrl: string | null | undefined,
  ingestMode?: "livepeer" | "local" | "demo",
): string {
  if (ingestMode === "demo" && playbackUrl) return playbackUrl;
  if (ingestKey?.startsWith("lb_")) return localHlsPlaybackPath(ingestKey);
  if (playbackUrl?.startsWith("/api/hls/")) return playbackUrl;
  if (playbackUrl) {
    try {
      const parsed = new URL(playbackUrl, "https://livebooth.uk");
      if (parsed.pathname.startsWith("/live/") && parsed.pathname.endsWith(".m3u8")) {
        return `/api/hls${parsed.pathname}${parsed.search}`;
      }
    } catch {
      /* keep original */
    }
    return playbackUrl;
  }
  return "";
}
