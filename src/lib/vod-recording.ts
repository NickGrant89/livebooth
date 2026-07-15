import "server-only";

import fs from "node:fs";
import path from "node:path";
import { hasStreamReplay } from "./playback-url";

const RECORDINGS_DIR =
  process.env.RECORDINGS_DIR ?? path.join(process.cwd(), "rtmp-server/recordings");

/** Public HTTPS base for VPS recordings, e.g. https://hls.livebooth.uk/recordings */
const RECORDINGS_PUBLIC_URL = process.env.RECORDINGS_PUBLIC_URL?.replace(/\/$/, "");

export function isLocalRecordingEnabled(): boolean {
  return Boolean(
    process.env.RTMP_SERVER_URL &&
      process.env.HLS_SERVER_URL &&
      !process.env.LIVEPEER_API_KEY,
  );
}

/** Bases to try when listing/fetching remote recordings (primary env + HLS /recordings fallback). */
export function getRecordingsPublicBaseUrls(): string[] {
  const hls = process.env.HLS_SERVER_URL?.replace(/\/$/, "");
  const candidates = [
    RECORDINGS_PUBLIC_URL,
    hls ? `${hls}/recordings` : undefined,
  ].filter(Boolean) as string[];
  return [...new Set(candidates)];
}

export function isRemoteRecordingEnabled(): boolean {
  return Boolean(isLocalRecordingEnabled() && getRecordingsPublicBaseUrls().length > 0);
}

function recordingDirForIngestKey(ingestKey: string): string {
  return path.join(RECORDINGS_DIR, "live", ingestKey);
}

export function getRemoteRecordingFileUrl(relativePath: string, baseUrl?: string): string | null {
  const base = baseUrl ?? getRecordingsPublicBaseUrls()[0];
  if (!base) return null;
  return `${base}/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

function parseRecordingFilenamesFromListing(html: string): string[] {
  const files = [
    ...html.matchAll(/href="([^"?]+\.(?:fmp4|mp4))"/gi),
    ...html.matchAll(/href='([^'?]+\.(?:fmp4|mp4))'/gi),
    ...html.matchAll(/>([^<]+\.(?:fmp4|mp4))<\//gi),
  ]
    .map((m) => decodeURIComponent(m[1]!.trim()))
    .map((f) => f.replace(/^\.\//, ""))
    .filter((f) => !f.includes("..") && !f.includes("/"));
  return [...new Set(files)];
}

async function listRemoteRecordingFilenames(
  baseUrl: string,
  ingestKey: string,
): Promise<string[]> {
  const listingUrl = `${baseUrl}/live/${encodeURIComponent(ingestKey)}/`;
  try {
    const res = await fetch(listingUrl, { cache: "no-store" });
    if (!res.ok) return [];
    const html = await res.text();
    return parseRecordingFilenamesFromListing(html);
  } catch {
    return [];
  }
}

/** Pick the largest file — full set beats partial reconnect artifacts. */
async function findLargestRemoteRecordingFilename(
  baseUrl: string,
  ingestKey: string,
): Promise<string | null> {
  const files = await listRemoteRecordingFilenames(baseUrl, ingestKey);
  if (files.length === 0) return null;

  const sized = await Promise.all(
    files.map(async (name) => {
      const url = `${baseUrl}/live/${encodeURIComponent(ingestKey)}/${encodeURIComponent(name)}`;
      try {
        const res = await fetch(url, { method: "HEAD", cache: "no-store" });
        if (!res.ok) return null;
        const size = parseInt(res.headers.get("content-length") ?? "0", 10);
        return size > 0 ? { name, size } : null;
      } catch {
        return null;
      }
    }),
  );

  let best: { name: string; size: number } | null = null;
  for (const entry of sized) {
    if (entry && (!best || entry.size > best.size)) best = entry;
  }
  return best?.name ?? null;
}

async function listRemoteRecordingFilename(
  baseUrl: string,
  ingestKey: string,
): Promise<string | null> {
  return findLargestRemoteRecordingFilename(baseUrl, ingestKey);
}

/** Parse Caddy file_server browse HTML for .fmp4 / .mp4 links. */
export async function findLatestRemoteRecordingFilename(ingestKey: string): Promise<string | null> {
  for (const base of getRecordingsPublicBaseUrls()) {
    const filename = await listRemoteRecordingFilename(base, ingestKey);
    if (filename) return filename;
  }
  return null;
}

async function resolveRemoteRecordingVodUrl(ingestKey: string): Promise<string | null> {
  for (const base of getRecordingsPublicBaseUrls()) {
    const filename = await listRemoteRecordingFilename(base, ingestKey);
    if (filename) return getRecordingPublicUrl(ingestKey, filename);
  }
  return null;
}

/** Pick the largest recording file (full set beats partial remux artifacts). */
export function findLatestRecordingFile(ingestKey: string): string | null {
  const dir = recordingDirForIngestKey(ingestKey);
  if (!fs.existsSync(dir)) return null;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".fmp4") || f.endsWith(".mp4"))
    .map((name) => {
      try {
        const full = path.join(dir, name);
        const st = fs.statSync(full);
        return { name, size: st.size, mtime: st.mtimeMs };
      } catch {
        return { name, size: 0, mtime: 0 };
      }
    })
    .filter((f) => f.size > 0);

  if (files.length === 0) return null;
  files.sort((a, b) => b.size - a.size || b.mtime - a.mtime);
  return files[0]!.name;
}

/** Same-origin proxy path — fallback when direct VPS URL fails in the browser. */
export function getClientRecordingPlaybackUrl(ingestKey: string, filename: string): string {
  const relativePath = `live/${ingestKey}/${filename}`;
  return `/api/vod/file/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

/** Browser playback URL — direct from VPS (fast Range requests); proxy is fallback only. */
export function getRecordingPublicUrl(ingestKey: string, filename: string): string {
  const relativePath = `live/${ingestKey}/${filename}`;
  if (isRemoteRecordingEnabled()) {
    const direct = getRemoteRecordingFileUrl(relativePath);
    if (direct) return direct;
  }
  return getClientRecordingPlaybackUrl(ingestKey, filename);
}

function relativePathFromVodUrl(url: string): string | null {
  if (url.includes("/api/vod/file/")) {
    const idx = url.indexOf("/api/vod/file/");
    return decodeURIComponent(url.slice(idx + "/api/vod/file/".length));
  }
  try {
    const parsed = new URL(url, "https://livebooth.uk");
    const match = parsed.pathname.match(/\/recordings\/(.+)$/i);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // ignore
  }
  const rel = url.match(/^live\/([^/?]+)$/i);
  if (rel) return rel[0];
  return null;
}

/** Rewrite stored proxy or legacy URLs to the fastest direct playback URL when possible. */
export function normalizeToClientVodUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const relative = relativePathFromVodUrl(url);
  if (relative && isRemoteRecordingEnabled()) {
    const direct = getRemoteRecordingFileUrl(relative);
    if (direct) return direct;
  }

  if (url.includes("/api/vod/file/")) return url;

  try {
    const parsed = new URL(url, "https://livebooth.uk");
    const match = parsed.pathname.match(/\/recordings\/live\/([^/]+)\/([^/]+)$/i);
    if (match?.[1] && match[2]) {
      return getRecordingPublicUrl(decodeURIComponent(match[1]), decodeURIComponent(match[2]));
    }
  } catch {
    // ignore
  }

  const rel = url.match(/^live\/([^/]+)\/([^/?]+)$/i);
  if (rel?.[1] && rel[2]) {
    return getRecordingPublicUrl(rel[1], rel[2]);
  }

  if (/\.(mp4|fmp4|webm)(\?|$)/i.test(url) && url.startsWith("/")) {
    return url;
  }

  return null;
}

async function remoteHlsPlaybackReady(ingestKey: string): Promise<string | null> {
  if (!isRemoteRecordingEnabled()) return null;
  const relativePath = `live/${ingestKey}/playback/index.m3u8`;
  for (const base of getRecordingsPublicBaseUrls()) {
    const url = getRemoteRecordingFileUrl(relativePath, base);
    if (!url) continue;
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (res.ok) return url;
    } catch {
      // try next base
    }
  }
  return null;
}

function findLocalHlsPlaybackUrl(ingestKey: string): string | null {
  const m3u8 = path.join(recordingDirForIngestKey(ingestKey), "playback", "index.m3u8");
  if (!fs.existsSync(m3u8)) return null;
  if (isRemoteRecordingEnabled()) {
    return getRemoteRecordingFileUrl(`live/${ingestKey}/playback/index.m3u8`);
  }
  return `/api/vod/file/live/${encodeURIComponent(ingestKey)}/playback/index.m3u8`;
}

function isLiveHlsArchiveUrl(url: string): boolean {
  if (url.includes("/recordings/")) return false;
  return (
    url.includes("/api/hls/") ||
    (url.includes("/live/") && url.includes(".m3u8")) ||
    (url.includes("hls.livebooth.uk") && url.includes(".m3u8"))
  );
}

/** Remux watcher waits ~3 min idle before processing; allow time for HLS VOD build. */
export const VOD_PROCESSING_WINDOW_MS = 12 * 60 * 1000;

export function isVodLikelyProcessing(
  endedAt: Date | null | undefined,
  ingestKey: string | null | undefined,
  vodUrl: string | null | undefined,
  playbackUrl: string | null | undefined,
): boolean {
  if (!endedAt || !ingestKey || !isLocalRecordingEnabled()) return false;
  if (hasStreamReplay(vodUrl, playbackUrl)) return false;
  return Date.now() - endedAt.getTime() < VOD_PROCESSING_WINDOW_MS;
}

async function resolveBestRecordingPlaybackUrl(ingestKey: string): Promise<string | null> {
  const localHls = findLocalHlsPlaybackUrl(ingestKey);
  if (localHls) return localHls;

  const remoteHls = await remoteHlsPlaybackReady(ingestKey);
  if (remoteHls) return remoteHls;

  const localFile = findLatestRecordingFile(ingestKey);
  if (localFile) return getRecordingPublicUrl(ingestKey, localFile);

  if (isRemoteRecordingEnabled()) {
    const filename = await findLatestRemoteRecordingFilename(ingestKey);
    if (filename) return getRecordingPublicUrl(ingestKey, filename);
  }

  return null;
}

/** Keep direct VPS URLs — only rewrite legacy paths missing the /recordings/ base. */
export function normalizeVodPlaybackUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url;
}

/** Resolve the best playback URL for an ended stream (always checks VPS for latest file). */
export async function resolveEndedStreamPlaybackUrl(
  ingestKey: string | null | undefined,
  storedUrl: string | null | undefined,
): Promise<string | null> {
  if (!ingestKey || !isLocalRecordingEnabled()) {
    const normalized = normalizeToClientVodUrl(storedUrl);
    if (normalized) return normalized;
    if (storedUrl && !isLiveHlsArchiveUrl(storedUrl)) return storedUrl;
    return null;
  }

  const resolved = await resolveBestRecordingPlaybackUrl(ingestKey);
  if (resolved) return resolved;

  const fromStored = normalizeToClientVodUrl(storedUrl);
  if (fromStored) return fromStored;

  if (storedUrl && !isLiveHlsArchiveUrl(storedUrl) && /\.(mp4|fmp4|webm)(\?|$)/i.test(storedUrl)) {
    return storedUrl;
  }

  return null;
}

export function resolveRecordingVodUrl(ingestKey: string | null | undefined): string | null {
  if (!ingestKey || !isLocalRecordingEnabled()) return null;
  const localHls = findLocalHlsPlaybackUrl(ingestKey);
  if (localHls) return localHls;
  const localFile = findLatestRecordingFile(ingestKey);
  if (localFile) return getRecordingPublicUrl(ingestKey, localFile);
  return null;
}

export async function resolveRecordingVodUrlWithRetry(
  ingestKey: string | null | undefined,
  attempts = 12,
  delayMs = 5000,
): Promise<string | null> {
  if (!ingestKey || !isLocalRecordingEnabled()) return null;

  for (let i = 0; i < attempts; i++) {
    const url = await resolveBestRecordingPlaybackUrl(ingestKey);
    if (url) return url;

    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return null;
}

/** Safe path under RECORDINGS_DIR for API file serving. */
export function resolveRecordingFilePath(relativeParts: string[]): string | null {
  const base = path.resolve(RECORDINGS_DIR);
  const target = path.resolve(base, ...relativeParts);
  if (!target.startsWith(base + path.sep) && target !== base) return null;
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return null;
  return target;
}

/** Relative path (live/{ingestKey}/{file}) for downloadable mp4/fmp4 — not HLS. */
export async function resolveRecordingDownloadRelativePath(
  ingestKey: string | null | undefined,
): Promise<string | null> {
  if (!ingestKey || !isLocalRecordingEnabled()) return null;

  const localFile = findLatestRecordingFile(ingestKey);
  if (localFile) return `live/${ingestKey}/${localFile}`;

  if (isRemoteRecordingEnabled()) {
    const filename = await findLatestRemoteRecordingFilename(ingestKey);
    if (filename) return `live/${ingestKey}/${filename}`;
  }

  return null;
}

export function suggestedRecordingDownloadFilename(
  streamTitle: string,
  recordingFilename: string,
): string {
  const ext = recordingFilename.includes(".")
    ? recordingFilename.split(".").pop()!
    : "mp4";
  const safe =
    streamTitle
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "livebooth-set";
  return `${safe}.${ext}`;
}

export function recordingsContentType(filename: string): string {
  if (filename.endsWith(".fmp4")) return "video/mp4";
  if (filename.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}
