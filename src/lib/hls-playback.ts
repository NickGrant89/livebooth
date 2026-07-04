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

/** True when OBS feed has an HLS manifest with media segments (incl. MediaMTX master playlists). */
export async function hlsManifestReady(url: string, depth = 0): Promise<boolean> {
  if (depth > 3) return false;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;
    const text = await res.text();
    if (/#EXTINF:[\d.]+/.test(text) || /#EXT-X-PART:/.test(text)) return true;

    if (text.includes("#EXT-X-STREAM-INF")) {
      const uriMatch = text.match(/URI="([^"]+\.m3u8[^"]*)"/i);
      if (uriMatch?.[1]) {
        return hlsManifestReady(new URL(uriMatch[1], url).href, depth + 1);
      }
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i]?.includes("#EXT-X-STREAM-INF")) continue;
        const next = lines[i + 1]?.trim();
        if (next && !next.startsWith("#") && next.includes(".m3u8")) {
          return hlsManifestReady(new URL(next, url).href, depth + 1);
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}
