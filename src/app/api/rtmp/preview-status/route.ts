import { prisma } from "@/lib/db";
import { json, error, isApiError, requireApiUser } from "@/lib/api-utils";
import { isRtmpAuthEnabled } from "@/lib/rtmp-auth";

export const dynamic = "force-dynamic";

const HLS_SERVER_URL = process.env.HLS_SERVER_URL?.replace(/\/$/, "");

type PathProbe = {
  path: string;
  status: number;
  hint?: string;
};

async function probeUpstreamHls(relativePath: string): Promise<PathProbe> {
  if (!HLS_SERVER_URL) {
    return { path: relativePath, status: 503, hint: "HLS_SERVER_URL not configured" };
  }
  const url = `${HLS_SERVER_URL}/${relativePath.replace(/^\//, "")}`;
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    let hint: string | undefined;
    if (!res.ok) {
      const text = await res.text();
      if (text.includes("no stream is available on path")) {
        const match = text.match(/path '([^']+)'/);
        hint = match?.[1] ? `MediaMTX: no publisher on ${match[1]}` : "MediaMTX: no stream on this path";
      } else if (text) {
        hint = text.slice(0, 120);
      }
    }
    return { path: relativePath, status: res.status, hint };
  } catch (e) {
    return {
      path: relativePath,
      status: 502,
      hint: e instanceof Error ? e.message : "Upstream HLS unreachable",
    };
  }
}

async function upstreamManifestReady(relativePath: string, depth = 0): Promise<boolean> {
  if (!HLS_SERVER_URL || depth > 3) return false;
  const url = `${HLS_SERVER_URL}/${relativePath.replace(/^\//, "")}`;
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    const text = await res.text();
    if (/#EXTINF:[\d.]+/.test(text) || /#EXT-X-PART:/.test(text)) return true;
    if (text.includes("#EXT-X-STREAM-INF")) {
      const uriMatch = text.match(/URI="([^"]+\.m3u8[^"]*)"/i);
      if (uriMatch?.[1]) {
        const next = new URL(uriMatch[1], url).pathname.replace(/^\//, "");
        return upstreamManifestReady(next, depth + 1);
      }
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i]?.includes("#EXT-X-STREAM-INF")) continue;
        const next = lines[i + 1]?.trim();
        if (next && !next.startsWith("#") && next.includes(".m3u8")) {
          return upstreamManifestReady(next.split("?")[0]!, depth + 1);
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (isApiError(auth)) return auth;

  const ingestKey = new URL(request.url).searchParams.get("ingestKey")?.trim();
  if (!ingestKey?.startsWith("lb_")) return error("Invalid ingest key", 400);

  const stream = await prisma.stream.findFirst({
    where: { ingestKey, djId: auth.id },
    select: { id: true, status: true, title: true },
  });

  const expectedPath = `live/${ingestKey}/index.m3u8`;

  const [upstream, feedReady, altLiveOnly] = await Promise.all([
    probeUpstreamHls(expectedPath),
    upstreamManifestReady(expectedPath),
    probeUpstreamHls("live/index.m3u8"),
  ]);

  let suggestion: string | null = null;
  if (!feedReady && upstream.status === 404) {
    if (altLiveOnly.status === 200) {
      suggestion =
        "OBS appears to be publishing without your stream key in the path. Use Server rtmp://rtmp.livebooth.uk:1935/live and put the full lb_… key in the Stream key field only.";
    } else if (!stream) {
      suggestion =
        "This stream key is not active in LiveBooth. Cancel setup and create a new stream, then update OBS with the new key.";
    } else if (stream.status !== "preparing" && stream.status !== "live") {
      suggestion = "This stream session has ended. Start a new Go Live session and update OBS.";
    } else {
      suggestion =
        "OBS may show connected but MediaMTX has no feed on this key. Click Stop Streaming in OBS, confirm the stream key matches exactly, then Start Streaming again.";
    }
  }

  return json({
    ingestKey,
    expectedPath,
    proxyPath: `/api/hls/${expectedPath}`,
    proxyReady: feedReady,
    upstream,
    rtmpAuthEnabled: isRtmpAuthEnabled(),
    dbStream: stream
      ? { id: stream.id, status: stream.status, title: stream.title }
      : null,
    suggestion,
  });
}
