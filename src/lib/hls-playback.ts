/** Same-origin HLS path for local lb_ ingest keys (browser + preview polling). */
export function localHlsPlaybackPath(ingestKey: string): string {
  return `/api/hls/live/${encodeURIComponent(ingestKey)}/index.m3u8`;
}

/** LiveBooth ingest via MediaMTX (LL-HLS fMP4 through /api/hls proxy). */
export function isProxiedMediaMtxHls(url: string): boolean {
  return url.includes("/api/hls/live/") || /hls\.livebooth\.uk\/live\//.test(url);
}

/** hls.js settings for MediaMTX default lowLatency fMP4 HLS. */
export function createMediaMtxHlsConfig() {
  return {
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 30,
    liveSyncDurationCount: 2,
    liveMaxLatencyDurationCount: 5,
    maxLiveSyncPlaybackRate: 1.2,
    liveDurationInfinity: true,
    manifestLoadingTimeOut: 15000,
    manifestLoadingMaxRetry: 8,
    fragLoadingTimeOut: 20000,
    fragLoadingMaxRetry: 8,
  } as const;
}

/** Safari plays MediaMTX HLS natively; hls.js LL-HLS mode is for Chrome/Firefox. */
export function preferNativeMediaMtxHls(): boolean {
  if (typeof window === "undefined") return false;
  const video = document.createElement("video");
  if (!video.canPlayType("application/vnd.apple.mpegurl")) return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox/i.test(ua);
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

/** True when an HLS manifest body indicates an active publisher / playable media. */
export function hlsManifestBodyReady(body: string): boolean {
  if (/#EXTINF:[\d.]+/.test(body)) return true;
  if (/#EXT-X-PART:/.test(body)) return true;
  // MediaMTX master playlist — publisher is active when variants are listed.
  if (/#EXT-X-STREAM-INF:/.test(body)) return true;
  return false;
}

function resolveManifestReference(manifestUrl: string, ref: string): string {
  const trimmed = ref.trim();
  if (!trimmed || trimmed.startsWith("#")) return "";

  if (trimmed.startsWith("/")) return trimmed;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "https://livebooth.uk").replace(/\/$/, "");

  const base = manifestUrl.startsWith("http")
    ? manifestUrl
    : `${origin}${manifestUrl.startsWith("/") ? manifestUrl : `/${manifestUrl}`}`;

  try {
    const resolved = new URL(trimmed, base);
    return `${resolved.pathname}${resolved.search}`;
  } catch {
    return trimmed;
  }
}

/** True when OBS feed has an HLS manifest with media (incl. MediaMTX master playlists). */
export async function hlsManifestReady(url: string, depth = 0): Promise<boolean> {
  if (depth > 3) return false;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;
    const text = await res.text();
    if (hlsManifestBodyReady(text)) return true;

    if (text.includes("#EXT-X-STREAM-INF")) {
      const uriMatch = text.match(/URI="([^"]+\.m3u8[^"]*)"/i);
      if (uriMatch?.[1]) {
        const next = resolveManifestReference(url, uriMatch[1]);
        if (next) return hlsManifestReady(next, depth + 1);
      }
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i]?.includes("#EXT-X-STREAM-INF")) continue;
        const next = lines[i + 1]?.trim();
        if (next && !next.startsWith("#") && next.includes(".m3u8")) {
          const nextUrl = resolveManifestReference(url, next);
          if (nextUrl) return hlsManifestReady(nextUrl, depth + 1);
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}
