import "server-only";

import { prisma } from "./db";
import { isBetaMode } from "./constants";
import {
  findLatestRemoteRecordingFilename,
  getRecordingsPublicBaseUrls,
  getRemoteRecordingFileUrl,
  isLocalRecordingEnabled,
  isRemoteRecordingEnabled,
} from "./vod-recording";

/** Don't prune sets that ended recently — remux/HLS may still be building. */
const PRUNE_MIN_AGE_MS = 45 * 60 * 1000;

type StreamRow = {
  id: string;
  ingestKey: string | null;
  vodUrl: string | null;
  playbackUrl: string | null;
  endedAt: Date | null;
};

async function headOk(url: string): Promise<boolean | null> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return null;
  }
}

async function remoteRecordingExists(ingestKey: string): Promise<boolean | null> {
  if (!isRemoteRecordingEnabled()) return null;

  const hlsPath = `live/${ingestKey}/playback/index.m3u8`;
  for (const base of getRecordingsPublicBaseUrls()) {
    const hlsUrl = getRemoteRecordingFileUrl(hlsPath, base);
    if (hlsUrl) {
      const ok = await headOk(hlsUrl);
      if (ok === true) return true;
      if (ok === null) return null;
    }
  }

  for (const base of getRecordingsPublicBaseUrls()) {
    const listingUrl = `${base}/live/${encodeURIComponent(ingestKey)}/`;
    try {
      const res = await fetch(listingUrl, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 404) continue;
        return null;
      }
      const html = await res.text();
      const hasMedia = /\.(?:mp4|fmp4|m3u8)/i.test(html);
      if (hasMedia) return true;
    } catch {
      return null;
    }
  }

  const filename = await findLatestRemoteRecordingFilename(ingestKey);
  if (filename) {
    for (const base of getRecordingsPublicBaseUrls()) {
      const fileUrl = getRemoteRecordingFileUrl(`live/${ingestKey}/${filename}`, base);
      if (fileUrl) {
        const ok = await headOk(fileUrl);
        if (ok === true) return true;
        if (ok === null) return null;
      }
    }
  }

  return false;
}

async function storedUrlExists(url: string | null): Promise<boolean | null> {
  if (!url) return false;
  if (!/\.(mp4|fmp4|webm|m3u8)(\?|$)/i.test(url)) return false;
  if (url.includes("/api/hls/") && url.includes(".m3u8")) return false;
  return headOk(url);
}

/** true = file exists, false = confirmed missing, null = unknown (skip prune). */
export async function streamRecordingExists(stream: StreamRow): Promise<boolean | null> {
  if (stream.ingestKey && isLocalRecordingEnabled()) {
    const remote = await remoteRecordingExists(stream.ingestKey);
    if (remote === true) return true;
    if (remote === null) return null;
  }

  for (const url of [stream.vodUrl, stream.playbackUrl]) {
    const stored = await storedUrlExists(url);
    if (stored === true) return true;
    if (stored === null) return null;
  }

  if (!stream.ingestKey && !stream.vodUrl && !stream.playbackUrl) return false;

  return stream.ingestKey ? false : null;
}

export async function pruneEndedStreamsWithoutRecording(
  streams: StreamRow[],
): Promise<string[]> {
  // During beta, never auto-remove archive entries — VPS hiccups should not hide replays.
  if (isBetaMode()) return [];

  const deleted: string[] = [];
  const now = Date.now();

  for (const stream of streams) {
    if (stream.endedAt && now - stream.endedAt.getTime() < PRUNE_MIN_AGE_MS) {
      continue;
    }

    const exists = await streamRecordingExists(stream);
    if (exists !== false) continue;

    try {
      await prisma.stream.delete({ where: { id: stream.id } });
      deleted.push(stream.id);
    } catch {
      /* already removed */
    }
  }

  return deleted;
}

export async function pruneDjArchive(djId: string): Promise<string[]> {
  const streams = await prisma.stream.findMany({
    where: { djId, status: "ended" },
    select: {
      id: true,
      ingestKey: true,
      vodUrl: true,
      playbackUrl: true,
      endedAt: true,
    },
  });
  return pruneEndedStreamsWithoutRecording(streams);
}

export async function pruneAdminArchives(): Promise<string[]> {
  const streams = await prisma.stream.findMany({
    where: { status: "ended" },
    select: {
      id: true,
      ingestKey: true,
      vodUrl: true,
      playbackUrl: true,
      endedAt: true,
    },
  });
  return pruneEndedStreamsWithoutRecording(streams);
}
