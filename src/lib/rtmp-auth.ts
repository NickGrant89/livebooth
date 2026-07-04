import { prisma } from "./db";

export type MediaMtxAuthPayload = {
  user?: string;
  password?: string;
  ip?: string;
  action?: string;
  path?: string;
  protocol?: string;
  query?: string;
};

/** When false, MediaMTX auth callback allows all publishes (local dev). */
export function isRtmpAuthEnabled(): boolean {
  return process.env.RTMP_AUTH_ENABLED === "true";
}

/**
 * Validate RTMP publish for MediaMTX HTTP auth.
 * OBS → rtmp://host/live with stream key `lb_…` → path `live/lb_…`
 */
export async function validateRtmpPublish(payload: MediaMtxAuthPayload): Promise<boolean> {
  if (!isRtmpAuthEnabled()) return true;

  const action = payload.action ?? "";
  if (action !== "publish") return true;

  const ingestKey = extractIngestKey(payload.path, payload.user, payload.password, payload.query);
  if (!ingestKey) return false;

  const stream = await prisma.stream.findFirst({
    where: {
      ingestKey,
      status: { in: ["preparing", "live"] },
    },
    select: { id: true },
  });

  return Boolean(stream);
}

function extractIngestKey(path?: string, user?: string, password?: string, query?: string): string | null {
  const trim = (s?: string) => s?.trim() ?? "";

  if (path) {
    const parts = trim(path).split("/").filter(Boolean);
    const liveIdx = parts.indexOf("live");
    if (liveIdx >= 0 && parts[liveIdx + 1]) {
      return parts[liveIdx + 1]!;
    }
    const last = parts[parts.length - 1];
    if (last?.startsWith("lb_") || last?.startsWith("st_")) return last;
  }

  for (const candidate of [user, password]) {
    const val = trim(candidate);
    if (val.startsWith("lb_") || val.startsWith("st_")) return val;
  }

  // MediaMTX RTMP may pass ?user=…&pass=… or key-only in query
  if (query) {
    const params = new URLSearchParams(query);
    for (const key of ["pass", "password", "key", "stream", "name"]) {
      const val = params.get(key);
      if (val?.startsWith("lb_") || val?.startsWith("st_")) return val;
    }
    for (const val of params.values()) {
      if (val.startsWith("lb_") || val.startsWith("st_")) return val;
    }
  }

  return null;
}
