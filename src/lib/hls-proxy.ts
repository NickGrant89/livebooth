import { localHlsPlaybackPath } from "./hls-playback";

const HLS_SERVER_URL = process.env.HLS_SERVER_URL?.replace(/\/$/, "");

export function hlsProxyEnabled(): boolean {
  if (!HLS_SERVER_URL) return false;
  if (process.env.NODE_ENV === "production") return true;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return Boolean(
    appUrl &&
      appUrl.startsWith("https://") &&
      !appUrl.includes("192.168.") &&
      !appUrl.includes("localhost"),
  );
}

/** Same-origin HLS URL for browser playback (avoids cross-origin HLS quirks). */
export function getProxiedHlsPlaybackUrl(ingestKey: string): string | null {
  if (!HLS_SERVER_URL || !hlsProxyEnabled()) return null;
  return localHlsPlaybackPath(ingestKey);
}

export function upstreamHlsUrl(pathParts: string[], search = ""): string | null {
  if (!HLS_SERVER_URL || !pathParts.length) return null;
  const path = pathParts.map(encodeURIComponent).join("/");
  return `${HLS_SERVER_URL}/${path}${search}`;
}

/** Rewrite playlist segment / variant URIs to stay on /api/hls. */
export function rewriteM3u8ForProxy(body: string, manifestPath: string): string {
  const dir = manifestPath.includes("/")
    ? manifestPath.replace(/\/[^/]*$/, "")
    : "";

  return body
    .split("\n")
    .map((line) => {
      const uriMatch = line.match(/URI="([^"]+)"/);
      if (uriMatch?.[1]) {
        const rewritten = toProxyPath(uriMatch[1], dir);
        return line.replace(uriMatch[1], rewritten);
      }
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      return toProxyPath(trimmed, dir);
    })
    .join("\n");
}

function toProxyPath(ref: string, dir: string): string {
  if (ref.startsWith("/api/hls/")) return ref;

  let path: string;
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    try {
      path = new URL(ref).pathname;
    } catch {
      return ref;
    }
  } else if (ref.startsWith("/")) {
    path = ref;
  } else {
    path = `${dir}/${ref}`.replace(/\/+/g, "/");
    if (!path.startsWith("/")) path = `/${path}`;
  }

  return `/api/hls${path}`;
}

export function hlsResponseHeaders(contentType: string): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Access-Control-Allow-Origin": "*",
  };
}
