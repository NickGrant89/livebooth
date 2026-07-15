import "server-only";

import { prisma } from "./db";
import { resolveRecordingVodUrlWithRetry } from "./vod-recording";
import { scheduleRecordingRemux } from "./recordings-remux";
import { deactivateCollabCompositor, resolveCollabVodIngestKey } from "./collab-compositor";
import {
  DEMO_HLS,
  isDemoPlayback,
  isFilePlaybackUrl,
  isVodPlaybackUrl,
  hasStreamReplay,
} from "./playback-url";
import { getProxiedHlsPlaybackUrl } from "./hls-proxy";
import { localHlsPlaybackPath } from "./hls-playback";

export { isDemoPlayback, isFilePlaybackUrl, isVodPlaybackUrl, hasStreamReplay };

const LIVEPEER_API_KEY = process.env.LIVEPEER_API_KEY;
const RTMP_SERVER_URL = process.env.RTMP_SERVER_URL?.replace(/\/$/, "");
const HLS_SERVER_URL = process.env.HLS_SERVER_URL?.replace(/\/$/, "");

function parseHttpLikeUrl(url: string): URL | null {
  try {
    return new URL(url.replace(/^rtmp:/, "http:"));
  } catch {
    return null;
  }
}

function isRawIpHost(hostname: string): boolean {
  return (
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
    hostname === "localhost" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.")
  );
}

/** Map https://hls.example.com → rtmp://rtmp.example.com:1935/live */
export function deriveRtmpFromHls(hlsUrl?: string): string | null {
  if (!hlsUrl) return null;
  try {
    const u = new URL(hlsUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.startsWith("hls.")) return null;
    return `rtmp://${u.hostname.replace(/^hls\./, "rtmp.")}:1935/live`;
  } catch {
    return null;
  }
}

/** Prefer rtmp.* domain over raw VPS IP when HLS uses hls.* subdomain. */
export function getEffectiveRtmpServerUrl(): string {
  const explicit = RTMP_SERVER_URL?.replace(/\/$/, "");
  const derived = deriveRtmpFromHls(HLS_SERVER_URL);

  if (explicit) {
    const host = parseHttpLikeUrl(explicit)?.hostname;
    if (host && isRawIpHost(host) && derived) return derived;
    return explicit;
  }
  if (derived) return derived;
  return "rtmp://127.0.0.1:1935/live";
}

function useLocalRtmp() {
  return Boolean(HLS_SERVER_URL && !LIVEPEER_API_KEY && getEffectiveRtmpServerUrl());
}

export function isLiveBoothIngestKey(ingestKey?: string | null) {
  return Boolean(ingestKey?.startsWith("lb_") || ingestKey?.startsWith("st_"));
}

function isLocalIngestKey(ingestKey?: string | null) {
  return !ingestKey || isLiveBoothIngestKey(ingestKey);
}

/** OBS server URL — stream key is a separate field (see RtmpCredentials). */
export function getRtmpIngestUrl(_ingestKey?: string | null): string {
  if (LIVEPEER_API_KEY && !isLocalIngestKey(_ingestKey)) {
    return "rtmp://rtmp.livepeer.com/live";
  }
  return getEffectiveRtmpServerUrl();
}

export function getHlsPlaybackUrl(ingestKey: string): string {
  const proxied = getProxiedHlsPlaybackUrl(ingestKey);
  if (proxied) return proxied;
  if (HLS_SERVER_URL) {
    return `${HLS_SERVER_URL}/live/${ingestKey}/index.m3u8`;
  }
  return DEMO_HLS;
}

/** Live streams: always use current HLS_SERVER_URL (avoids stale LAN URLs in DB). */
export function resolveLivePlaybackUrl(
  status: string,
  ingestKey: string | null | undefined,
  storedPlaybackUrl: string | null | undefined,
): string | null | undefined {
  if ((status !== "live" && status !== "preparing") || !ingestKey) return storedPlaybackUrl;
  if (isLocalIngestKey(ingestKey) && HLS_SERVER_URL) {
    return getHlsPlaybackUrl(ingestKey);
  }
  return storedPlaybackUrl;
}

export const BROADCAST_ACTIVE_STATUSES = ["preparing", "live"] as const;

export function isLocalRtmpMode() {
  return useLocalRtmp();
}

export type IngestMode = "livepeer" | "local" | "demo";

export function getIngestMode(): IngestMode {
  if (LIVEPEER_API_KEY) return "livepeer";
  if (useLocalRtmp()) return "local";
  return "demo";
}

export function getIngestModeForStream(
  ingestKey: string | null,
  playbackUrl: string | null,
): IngestMode {
  if (playbackUrl?.includes("livepeercdn.studio")) return "livepeer";
  if (playbackUrl?.includes("/api/hls/live/")) return "local";
  if (HLS_SERVER_URL && playbackUrl?.startsWith(HLS_SERVER_URL)) return "local";
  if (playbackUrl && playbackUrl !== DEMO_HLS && !playbackUrl.includes("mux.dev")) {
    return "local";
  }
  return isLocalIngestKey(ingestKey) ? getIngestMode() : "livepeer";
}

export async function createStationChannelSession(
  ownerId: string,
  stationId: string,
  title: string,
  genre: string,
  description = "",
) {
  const ingestKey = `st_${crypto.randomUUID().replace(/-/g, "")}`;
  const playbackUrl = useLocalRtmp()
    ? getHlsPlaybackUrl(ingestKey)
    : process.env.NODE_ENV === "production"
      ? getHlsPlaybackUrl(ingestKey)
      : DEMO_HLS;

  return prisma.stream.create({
    data: {
      djId: ownerId,
      title,
      description,
      genre,
      status: "preparing",
      ingestKey,
      playbackUrl,
      stationId,
      stationChannel: true,
    },
  });
}

export async function createStreamSession(
  djId: string,
  title: string,
  genre: string,
  bpmRange?: string,
  stationId?: string | null,
  description = "",
) {
  const ingestKey = `lb_${crypto.randomUUID().replace(/-/g, "")}`;

  if (LIVEPEER_API_KEY) {
    try {
      const res = await fetch("https://livepeer.studio/api/stream", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LIVEPEER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: title,
          record: true,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          id: string;
          streamKey: string;
          playbackId: string;
        };
        const playbackUrl = `https://livepeercdn.studio/hls/${data.playbackId}/index.m3u8`;
        return prisma.stream.create({
          data: {
            djId,
            title,
            description,
            genre,
            bpmRange,
            status: "preparing",
            ingestKey: data.streamKey,
            playbackUrl,
            providerStreamId: data.id,
            stationId: stationId ?? undefined,
          },
        });
      }
    } catch {
      /* fall through to local/demo */
    }
  }

  const playbackUrl = useLocalRtmp()
    ? getHlsPlaybackUrl(ingestKey)
    : process.env.NODE_ENV === "production"
      ? getHlsPlaybackUrl(ingestKey)
      : DEMO_HLS;

  return prisma.stream.create({
    data: {
      djId,
      title,
      description,
      genre,
      bpmRange,
      status: "preparing",
      ingestKey,
      playbackUrl,
      stationId: stationId ?? undefined,
    },
  });
}

export async function publishStreamSession(streamId: string, djId: string) {
  const stream = await prisma.stream.findFirst({
    where: { id: streamId, djId, status: "preparing" },
  });
  if (!stream) return null;

  return prisma.stream.update({
    where: { id: streamId },
    data: {
      status: "live",
      startedAt: new Date(),
    },
  });
}

export async function cancelStreamPreview(streamId: string, djId: string) {
  const stream = await prisma.stream.findFirst({
    where: { id: streamId, djId, status: "preparing" },
  });
  if (!stream) return null;
  return prisma.stream.delete({ where: { id: streamId } });
}

export async function endStreamSession(streamId: string, djId: string) {
  const stream = await prisma.stream.findFirst({
    where: { id: streamId, djId },
  });
  if (!stream) return null;

  const hostCollab = await prisma.streamCollab.findUnique({
    where: { streamId },
    include: { partnerStream: true },
  });
  const hostVodCollab = hostCollab
    ? {
        compositorActive: hostCollab.compositorActive,
        compositedIngestKey: hostCollab.compositedIngestKey,
      }
    : null;
  if (hostCollab) {
    await deactivateCollabCompositor(hostCollab.id);
  }
  if (hostCollab?.partnerStreamId && hostCollab.partnerStream?.status !== "ended") {
    await endStreamSession(hostCollab.partnerStreamId, hostCollab.partnerDjId);
    await prisma.streamCollab.update({
      where: { id: hostCollab.id },
      data: { status: "ended" },
    });
  }

  const partnerCollab = await prisma.streamCollab.findFirst({
    where: { partnerStreamId: streamId, status: "active" },
  });
  if (partnerCollab) {
    await deactivateCollabCompositor(partnerCollab.id);
    await prisma.streamCollab.update({
      where: { id: partnerCollab.id },
      data: { status: "ended" },
    });
  }

  let vodUrl: string | null = stream.vodUrl ?? stream.playbackUrl;
  const vodIngestKey = resolveCollabVodIngestKey(stream.ingestKey, hostVodCollab ?? undefined);
  if (vodIngestKey && isLocalRtmpMode()) {
    const recorded = await resolveRecordingVodUrlWithRetry(vodIngestKey, 10, 4000);
    vodUrl = recorded;
    void scheduleRecordingRemux(vodIngestKey);
  }

  return prisma.stream.update({
    where: { id: streamId },
    data: {
      status: "ended",
      endedAt: new Date(),
      vodUrl,
    },
  });
}
