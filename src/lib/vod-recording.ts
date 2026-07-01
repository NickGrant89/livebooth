import fs from "node:fs";
import path from "node:path";

const RECORDINGS_DIR =
  process.env.RECORDINGS_DIR ?? path.join(process.cwd(), "rtmp-server/recordings");

export function isLocalRecordingEnabled(): boolean {
  return Boolean(
    process.env.RTMP_SERVER_URL &&
      process.env.HLS_SERVER_URL &&
      !process.env.LIVEPEER_API_KEY,
  );
}

function recordingDirForIngestKey(ingestKey: string): string {
  return path.join(RECORDINGS_DIR, "live", ingestKey);
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
  return `/api/vod/file/live/${encodeURIComponent(ingestKey)}/${encodeURIComponent(filename)}`;
}

export function resolveRecordingVodUrl(ingestKey: string | null | undefined): string | null {
  if (!ingestKey || !isLocalRecordingEnabled()) return null;
  const file = findLatestRecordingFile(ingestKey);
  if (!file) return null;
  return getRecordingPublicUrl(ingestKey, file);
}

export async function resolveRecordingVodUrlWithRetry(
  ingestKey: string | null | undefined,
  attempts = 4,
  delayMs = 1200,
): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    const url = resolveRecordingVodUrl(ingestKey);
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

export function recordingsContentType(filename: string): string {
  if (filename.endsWith(".fmp4")) return "video/mp4";
  if (filename.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}
