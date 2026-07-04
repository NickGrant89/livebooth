import { localHlsPlaybackPath } from "./hls-playback";

const HLS_SERVER_URL = process.env.HLS_SERVER_URL?.replace(/\/$/, "");

/** MediaMTX issues hlsSession on index.m3u8; variant playlists and segments require it. */
const hlsSessionCache = new Map<string, { session: string; expires: number }>();
const HLS_SESSION_TTL_MS = 5 * 60_000;

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

export function parseHlsSessionCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/\bhlsSession=([^;\s]+)/);
  return match?.[1] ?? null;
}

function liveStreamSessionKey(pathParts: string[]): string | null {
  if (pathParts[0] === "live" && pathParts[1]?.startsWith("lb_")) {
    return `${pathParts[0]}/${pathParts[1]}`;
  }
  return null;
}

export function readHlsSessionFromHeaders(headers: Headers): string | null {
  const fromList = headers.getSetCookie?.() ?? [];
  for (const cookie of fromList) {
    const match = cookie.match(/^hlsSession=([^;]+)/);
    if (match?.[1]) return match[1];
  }
  const single = headers.get("set-cookie");
  if (single) {
    const match = single.match(/hlsSession=([^;]+)/);
    if (match?.[1]) return match[1];
  }
  return null;
}

function cacheHlsSession(streamKey: string, session: string): void {
  hlsSessionCache.set(streamKey, {
    session,
    expires: Date.now() + HLS_SESSION_TTL_MS,
  });
}

/** Cache session after a successful upstream response (e.g. index.m3u8 Set-Cookie). */
export function rememberHlsSession(pathParts: string[], session: string | null | undefined): void {
  if (!session) return;
  const streamKey = liveStreamSessionKey(pathParts);
  if (streamKey) cacheHlsSession(streamKey, session);
}

function cachedHlsSession(streamKey: string): string | null {
  const entry = hlsSessionCache.get(streamKey);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    hlsSessionCache.delete(streamKey);
    return null;
  }
  return entry.session;
}

/** Client Set-Cookie so the browser reuses hlsSession on same-origin /api/hls requests. */
export function clientHlsSessionSetCookie(session: string): string {
  const secure =
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://");
  const attrs = secure
    ? "Path=/api/hls; Secure; HttpOnly; SameSite=Lax"
    : "Path=/api/hls; HttpOnly; SameSite=Lax";
  return `hlsSession=${session}; ${attrs}`;
}

function buildUpstreamCookieHeader(hlsSession: string | null | undefined): string {
  const parts = ["cookieCheck=1"];
  if (hlsSession) parts.push(`hlsSession=${hlsSession}`);
  return parts.join("; ");
}

/** Resolve hlsSession from client cookie, cache, or index.m3u8 bootstrap. */
export async function resolveUpstreamHlsSession(
  pathParts: string[],
  clientCookieHeader: string | null | undefined,
): Promise<string | null> {
  const fromClient = parseHlsSessionCookie(clientCookieHeader);
  const streamKey = liveStreamSessionKey(pathParts);
  if (fromClient) {
    if (streamKey) cacheHlsSession(streamKey, fromClient);
    return fromClient;
  }
  if (!streamKey) return null;

  const cached = cachedHlsSession(streamKey);
  if (cached) return cached;

  // index.m3u8 is public; MediaMTX returns hlsSession in Set-Cookie on that response.
  const manifestName = pathParts[pathParts.length - 1] ?? "";
  if (manifestName === "index.m3u8") return null;

  if (!HLS_SERVER_URL) return null;
  const indexUrl = `${HLS_SERVER_URL}/${streamKey}/index.m3u8`;
  try {
    const res = await fetchUpstreamHls(indexUrl, { timeoutMs: 5000 });
    const session = readHlsSessionFromHeaders(res.headers);
    if (session) {
      cacheHlsSession(streamKey, session);
      return session;
    }
  } catch {
    /* bootstrap failed */
  }
  return null;
}

/** Fetch from MediaMTX HLS (handles HTTPS cookie gate on hls.livebooth.uk). */
export async function fetchUpstreamHls(
  url: string,
  init?: RequestInit & { timeoutMs?: number; hlsSession?: string | null },
): Promise<Response> {
  const withCookie = url.includes("cookieCheck=")
    ? url
    : `${url}${url.includes("?") ? "&" : "?"}cookieCheck=1`;
  const { timeoutMs = 8000, hlsSession, ...fetchInit } = init ?? {};
  return fetch(withCookie, {
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "*/*",
      Cookie: buildUpstreamCookieHeader(hlsSession),
      ...fetchInit.headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
    ...fetchInit,
  });
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
