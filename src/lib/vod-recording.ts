import "server-only";

import fs from "node:fs";
import path from "node:path";

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

async function listRemoteRecordingFilename(
  baseUrl: string,
  ingestKey: string,
): Promise<string | null> {
  const listingUrl = `${baseUrl}/live/${encodeURIComponent(ingestKey)}/`;
  try {
    const res = await fetch(listingUrl, { cache: "no-store" });
    if (!res.ok) return null;
    const html = await res.text();
    const unique = parseRecordingFilenamesFromListing(html);
    if (unique.length === 0) return null;
    return unique.sort().at(-1)!;
  } catch {
    return null;
  }
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

/** Latest fmp4/mp4 for an ingest key, if MediaMTX finished writing it. */
export function findLatestRecordingFile(ingestKey: string): string | null {
  const dir = recordingDirForIngestKey(ingestKey);
  if (!fs.existsSync(dir)) return null;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".fmp4") || f.endsWith(".mp4"))
    .sort();

  if (files.length === 0) return null;
  return files[files.length - 1]!;
}

export function getRecordingPublicUrl(ingestKey: string, filename: string): string {
  const relativePath = `live/${ingestKey}/${filename}`;
  if (isRemoteRecordingEnabled()) {
    const direct = getRemoteRecordingFileUrl(relativePath);
    if (direct) return direct;
  }
  return `/api/vod/file/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
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
    return storedUrl ?? null;
  }

  const localFile = findLatestRecordingFile(ingestKey);
  if (localFile) return getRecordingPublicUrl(ingestKey, localFile);

  if (isRemoteRecordingEnabled()) {
    const filename = await findLatestRemoteRecordingFilename(ingestKey);
    if (filename) return getRecordingPublicUrl(ingestKey, filename);
  }

  return normalizeVodPlaybackUrl(storedUrl);
}

export function resolveRecordingVodUrl(ingestKey: string | null | undefined): string | null {
  if (!ingestKey || !isLocalRecordingEnabled()) return null;
  const localFile = findLatestRecordingFile(ingestKey);
  if (localFile) return getRecordingPublicUrl(ingestKey, localFile);
  return null;
}

export async function resolveRecordingVodUrlWithRetry(
  ingestKey: string | null | undefined,
  attempts = 8,
  delayMs = 2000,
): Promise<string | null> {
  if (!ingestKey || !isLocalRecordingEnabled()) return null;

  for (let i = 0; i < attempts; i++) {
    const localFile = findLatestRecordingFile(ingestKey);
    if (localFile) return getRecordingPublicUrl(ingestKey, localFile);

    if (isRemoteRecordingEnabled()) {
      const remote = await resolveRemoteRecordingVodUrl(ingestKey);
      if (remote) return remote;
    }

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

export function recordingsContentType(filename: string): string {
  if (filename.endsWith(".fmp4")) return "video/mp4";
  if (filename.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}
