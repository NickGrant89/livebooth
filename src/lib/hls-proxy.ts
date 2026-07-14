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
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete("hlsSession");
  const qs = params.toString();
  return `${HLS_SERVER_URL}/${path}${qs ? `?${qs}` : ""}`;
}

/** Live booth ingest keys use per-URL hlsSession (supports collab dual-player). */
export function liveStreamUsesQuerySession(pathParts: string[]): boolean {
  return liveStreamSessionKey(pathParts) !== null;
}

export function parseHlsSessionCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/\bhlsSession=([^;\s]+)/);
  return match?.[1] ?? null;
}

function liveStreamSessionKey(pathParts: string[]): string | null {
  const key = pathParts[1];
  if (pathParts[0] === "live" && (key?.startsWith("lb_") || key?.startsWith("st_"))) {
    return `${pathParts[0]}/${key}`;
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
  // Live booth streams use per-viewer sessions in query params — never share server cache.
  if (liveStreamSessionKey(pathParts)) return;
  const streamKey = pathParts.slice(0, 2).join("/");
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
  querySession?: string | null,
): Promise<string | null> {
  const liveKey = liveStreamSessionKey(pathParts);

  if (querySession) return querySession;

  // Live booth: per-viewer sessions travel in manifest query params — ignore shared cookies/cache.
  if (liveKey) {
    return null;
  }

  const fromClient = parseHlsSessionCookie(clientCookieHeader);
  if (fromClient) return fromClient;

  const streamKey = pathParts.slice(0, 2).join("/");
  if (!streamKey) return null;

  const cached = cachedHlsSession(streamKey);
  if (cached) return cached;

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
export function rewriteM3u8ForProxy(
  body: string,
  manifestPath: string,
  hlsSession?: string | null,
): string {
  const dir = manifestPath.includes("/")
    ? manifestPath.replace(/\/[^/]*$/, "")
    : "";

  return body
    .split("\n")
    .map((line) => {
      const uriMatch = line.match(/URI="([^"]+)"/i) ?? line.match(/URI='([^']+)'/i);
      if (uriMatch?.[1]) {
        const rewritten = toProxyPath(uriMatch[1], dir, hlsSession);
        return line.replace(uriMatch[1], rewritten);
      }
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      return toProxyPath(trimmed, dir, hlsSession);
    })
    .join("\n");
}

function appendHlsSessionQuery(proxyPath: string, hlsSession?: string | null): string {
  if (!hlsSession) return proxyPath;
  const base = proxyPath.split("?")[0]!;
  return `${base}?hlsSession=${encodeURIComponent(hlsSession)}`;
}

function toProxyPath(ref: string, dir: string, hlsSession?: string | null): string {
  if (ref.startsWith("/api/hls/")) {
    return appendHlsSessionQuery(ref, hlsSession);
  }

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

  return appendHlsSessionQuery(`/api/hls${path}`, hlsSession);
}

export function hlsResponseHeaders(contentType: string): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Access-Control-Allow-Origin": "*",
  };
}
