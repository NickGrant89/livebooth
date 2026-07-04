import { error } from "@/lib/api-utils";
import {
  fetchUpstreamHls,
  hlsResponseHeaders,
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

  const { search } = new URL(request.url);
  const upstream = upstreamHlsUrl(parts, search);
  if (!upstream) return error("HLS not configured", 503);

  try {
    const res = await fetchUpstreamHls(upstream);

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

    if (isManifest) {
      const text = await res.text();
      const rewritten = rewriteM3u8ForProxy(text, manifestPath);
      return new Response(rewritten, {
        status: 200,
        headers: hlsResponseHeaders("application/vnd.apple.mpegurl"),
      });
    }

    const data = await res.arrayBuffer();
    return new Response(data, {
      status: 200,
      headers: hlsResponseHeaders(contentType),
    });
  } catch (e) {
    console.error("[hls-proxy]", upstream, e);
    return error("HLS proxy failed", 502);
  }
}
