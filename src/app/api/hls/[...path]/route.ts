import { error } from "@/lib/api-utils";
import {
  clientHlsSessionSetCookie,
  fetchUpstreamHls,
  hlsResponseHeaders,
  liveStreamUsesQuerySession,
  readHlsSessionFromHeaders,
  rememberHlsSession,
  resolveUpstreamHlsSession,
  rewriteM3u8ForProxy,
  upstreamHlsUrl,
} from "@/lib/hls-proxy";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  if (!parts?.length) return error("Not found", 404);

  const requestUrl = new URL(request.url);
  const { search } = requestUrl;
  const upstream = upstreamHlsUrl(parts, search);
  if (!upstream) return error("HLS not configured", 503);

  try {
    const hlsSession = await resolveUpstreamHlsSession(
      parts,
      request.headers.get("cookie"),
      requestUrl.searchParams.get("hlsSession"),
    );
    const res = await fetchUpstreamHls(upstream, { hlsSession });

    if (!res.ok) {
      return error("Upstream HLS error", res.status === 404 ? 404 : 502);
    }

    const manifestPath = parts.join("/");
    const isManifest = manifestPath.endsWith(".m3u8");
    const isMp4 = /\.(mp4|m4s)(\?|$)/i.test(manifestPath);
    const contentType =
      res.headers.get("content-type") ??
      (isManifest
        ? "application/vnd.apple.mpegurl"
        : isMp4
          ? "video/mp4"
          : "application/octet-stream");

    const responseSession = readHlsSessionFromHeaders(res.headers) ?? hlsSession;
    rememberHlsSession(parts, responseSession);
    const headers = hlsResponseHeaders(contentType);
    // Per-stream session lives in manifest/segment query params so collab dual-HLS works.
    const useQuerySession = Boolean(responseSession && liveStreamUsesQuerySession(parts));
    if (responseSession && !useQuerySession) {
      headers["Set-Cookie"] = clientHlsSessionSetCookie(responseSession);
    }

    if (isManifest) {
      const text = await res.text();
      const rewritten = rewriteM3u8ForProxy(
        text,
        manifestPath,
        useQuerySession ? responseSession : null,
      );
      return new Response(rewritten, {
        status: 200,
        headers,
      });
    }

    const data = await res.arrayBuffer();
    return new Response(data, {
      status: 200,
      headers,
    });
  } catch (e) {
    console.error("[hls-proxy]", upstream, e);
    return error("HLS proxy failed", 502);
  }
}
