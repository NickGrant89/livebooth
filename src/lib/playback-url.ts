const DEMO_HLS = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
const HLS_SERVER_URL = process.env.HLS_SERVER_URL?.replace(/\/$/, "");

/** Client-safe playback URL helpers (no Node / DB imports). */

export function isDemoPlayback(playbackUrl: string | null | undefined): boolean {
  if (!playbackUrl) return true;
  if (playbackUrl.includes("/api/vod/file/")) return false;
  return playbackUrl.includes("mux.dev/x36xhzz");
}

export function isFilePlaybackUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.includes("/api/vod/file/") ||
    /\.(mp4|fmp4|webm)(\?|$)/i.test(url)
  );
}

/** Archived HLS VOD under /recordings/ (not the live /live/…/index.m3u8 feed). */
export function isArchivedHlsVodUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("/recordings/") && url.includes(".m3u8");
}

export function isVodPlaybackUrl(url: string | null | undefined): boolean {
  return isFilePlaybackUrl(url) || isArchivedHlsVodUrl(url) || isDemoPlayback(url);
}

/** Whether an ended stream has a playable archive (not a dead live HLS URL). */
export function hasStreamReplay(
  vodUrl: string | null | undefined,
  playbackUrl: string | null | undefined,
): boolean {
  const url = vodUrl ?? playbackUrl;
  if (!url) return false;
  if (isFilePlaybackUrl(url)) return true;
  if (isArchivedHlsVodUrl(url)) return true;
  if (url.includes("livepeercdn.studio")) return true;
  if (url.includes("/recordings/")) return true;
  if (HLS_SERVER_URL && url.startsWith(HLS_SERVER_URL) && url.includes("/live/") && url.includes(".m3u8")) {
    return false;
  }
  if (url.includes("hls.livebooth.uk/live/")) return false;
  if (isDemoPlayback(url)) return true;
  return false;
}

export { DEMO_HLS };
