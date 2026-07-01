import { prisma } from "./db";
import { resolveRecordingVodUrlWithRetry } from "./vod-recording";

const LIVEPEER_API_KEY = process.env.LIVEPEER_API_KEY;
const RTMP_SERVER_URL = process.env.RTMP_SERVER_URL?.replace(/\/$/, "");
const HLS_SERVER_URL = process.env.HLS_SERVER_URL?.replace(/\/$/, "");

const DEMO_HLS = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

function useLocalRtmp() {
  return Boolean(RTMP_SERVER_URL && HLS_SERVER_URL && !LIVEPEER_API_KEY);
}

function isLocalIngestKey(ingestKey?: string | null) {
  return !ingestKey || ingestKey.startsWith("lb_");
}

/** OBS server field (stream key is separate). */
export function getRtmpIngestUrl(ingestKey?: string | null): string {
  if (LIVEPEER_API_KEY && !isLocalIngestKey(ingestKey)) {
    return "rtmp://rtmp.livepeer.com/live";
  }
  if (RTMP_SERVER_URL) return RTMP_SERVER_URL;
  return "rtmp://127.0.0.1:1935/live";
}

export function getHlsPlaybackUrl(ingestKey: string): string {
  if (HLS_SERVER_URL) {
    return `${HLS_SERVER_URL}/live/${ingestKey}/index.m3u8`;
  }
  return DEMO_HLS;
}

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
  if (HLS_SERVER_URL && playbackUrl?.startsWith(HLS_SERVER_URL)) return "local";
  if (playbackUrl && playbackUrl !== DEMO_HLS && !playbackUrl.includes("mux.dev")) {
    return "local";
  }
  return isLocalIngestKey(ingestKey) ? getIngestMode() : "livepeer";
}

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

export async function createStreamSession(
  djId: string,
  title: string,
  genre: string,
  bpmRange?: string,
  stationId?: string | null,
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
            genre,
            bpmRange,
            status: "live",
            ingestKey: data.streamKey,
            playbackUrl,
            providerStreamId: data.id,
            startedAt: new Date(),
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
    : DEMO_HLS;

  return prisma.stream.create({
    data: {
      djId,
      title,
      genre,
      bpmRange,
      status: "live",
      ingestKey,
      playbackUrl,
      startedAt: new Date(),
      stationId: stationId ?? undefined,
    },
  });
}

export async function endStreamSession(streamId: string, djId: string) {
  const stream = await prisma.stream.findFirst({
    where: { id: streamId, djId },
  });
  if (!stream) return null;

  let vodUrl = stream.playbackUrl;
  if (stream.ingestKey && isLocalRtmpMode()) {
    const recorded = await resolveRecordingVodUrlWithRetry(stream.ingestKey);
    if (recorded) vodUrl = recorded;
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
