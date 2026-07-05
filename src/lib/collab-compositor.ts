import "server-only";

import { prisma } from "./db";
import { getHlsPlaybackUrl, isLocalRtmpMode } from "./streaming";
import { hlsManifestReady } from "./hls-playback";

const COMPOSITOR_CONTROL_URL = process.env.COMPOSITOR_CONTROL_URL?.replace(/\/$/, "");
const COMPOSITOR_SECRET = process.env.COMPOSITOR_SECRET ?? "";
const COMPOSITOR_ENABLED = process.env.COMPOSITOR_ENABLED === "true";

/** Output ingest key for server-mixed collab stream. */
export function getCompositedIngestKey(hostIngestKey: string): string {
  return `${hostIngestKey}_mix`;
}

export function isCollabCompositorConfigured(): boolean {
  return COMPOSITOR_ENABLED && Boolean(COMPOSITOR_CONTROL_URL);
}

async function compositorFetch(path: string, body: Record<string, string>) {
  if (!COMPOSITOR_CONTROL_URL) throw new Error("Compositor not configured");
  const res = await fetch(`${COMPOSITOR_CONTROL_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(COMPOSITOR_SECRET ? { "X-Compositor-Secret": COMPOSITOR_SECRET } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
  if (!res.ok) {
    throw new Error(data.error ?? `Compositor ${path} failed (${res.status})`);
  }
  return data;
}

export async function startCollabCompositor(hostKey: string, partnerKey: string, outputKey: string) {
  if (!isCollabCompositorConfigured()) return { started: false, reason: "not_configured" as const };
  await compositorFetch("/start", { hostKey, partnerKey, outputKey });
  return { started: true as const };
}

export async function stopCollabCompositor(outputKey: string) {
  if (!isCollabCompositorConfigured()) return;
  try {
    await compositorFetch("/stop", { outputKey });
  } catch (e) {
    console.error("collab compositor stop:", e);
  }
}

async function waitForCompositeManifest(outputKey: string, attempts = 20): Promise<boolean> {
  const hlsBase = process.env.HLS_SERVER_URL?.replace(/\/$/, "");
  if (!hlsBase) return false;
  const url = `${hlsBase}/live/${encodeURIComponent(outputKey)}/index.m3u8`;
  for (let i = 0; i < attempts; i++) {
    if (await hlsManifestReady(url)) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

/** Start compositor when both host and partner feeds are live; update StreamCollab flags. */
export async function tryActivateCollabCompositor(collabId: string) {
  if (!isCollabCompositorConfigured() || !isLocalRtmpMode()) {
    return { active: false, reason: "compositor_unavailable" as const };
  }

  const collab = await prisma.streamCollab.findUnique({
    where: { id: collabId },
    include: {
      stream: { select: { id: true, status: true, ingestKey: true } },
      partnerStream: { select: { id: true, status: true, ingestKey: true } },
    },
  });

  if (!collab || collab.status !== "active") {
    return { active: false, reason: "collab_not_active" as const };
  }
  if (!collab.stream.ingestKey || !collab.partnerStream?.ingestKey) {
    return { active: false, reason: "missing_ingest_keys" as const };
  }
  if (collab.stream.status !== "live" || collab.partnerStream.status !== "live") {
    return { active: false, reason: "both_not_live" as const };
  }

  const outputKey = getCompositedIngestKey(collab.stream.ingestKey);

  if (collab.compositorActive && collab.compositedIngestKey === outputKey) {
    return { active: true, outputKey, reason: "already_active" as const };
  }

  try {
    await startCollabCompositor(collab.stream.ingestKey, collab.partnerStream.ingestKey, outputKey);
  } catch (e) {
    console.error("collab compositor start:", e);
    return { active: false, reason: "start_failed" as const };
  }

  const ready = await waitForCompositeManifest(outputKey);
  if (!ready) {
    await stopCollabCompositor(outputKey);
    return { active: false, reason: "manifest_timeout" as const };
  }

  await prisma.streamCollab.update({
    where: { id: collabId },
    data: {
      compositorActive: true,
      compositedIngestKey: outputKey,
      compositorStartedAt: new Date(),
    },
  });

  return { active: true, outputKey, reason: "activated" as const };
}

export async function deactivateCollabCompositor(collabId: string) {
  const collab = await prisma.streamCollab.findUnique({
    where: { id: collabId },
    select: { compositedIngestKey: true, compositorActive: true },
  });
  if (!collab) return;

  if (collab.compositedIngestKey) {
    await stopCollabCompositor(collab.compositedIngestKey);
  }

  if (collab.compositorActive || collab.compositedIngestKey) {
    await prisma.streamCollab.update({
      where: { id: collabId },
      data: {
        compositorActive: false,
        compositedIngestKey: null,
        compositorStartedAt: null,
      },
    });
  }
}

type CollabPlaybackInfo = {
  compositorActive: boolean;
  compositedIngestKey: string | null;
};

/** Viewer playback: composited mix when active, else host feed. */
export function resolveCollabViewerPlaybackUrl(
  hostStatus: string,
  hostIngestKey: string | null | undefined,
  hostPlaybackUrl: string | null | undefined,
  collab: CollabPlaybackInfo | null | undefined,
): string | null | undefined {
  if (
    collab?.compositorActive &&
    collab.compositedIngestKey &&
    hostStatus === "live" &&
    isLocalRtmpMode()
  ) {
    return getHlsPlaybackUrl(collab.compositedIngestKey);
  }
  if ((hostStatus !== "live" && hostStatus !== "preparing") || !hostIngestKey) {
    return hostPlaybackUrl;
  }
  if (isLocalRtmpMode()) {
    return getHlsPlaybackUrl(hostIngestKey);
  }
  return hostPlaybackUrl;
}

/** Resolve VOD recording key — prefer composited output when collab mix was used. */
export function resolveCollabVodIngestKey(
  hostIngestKey: string | null | undefined,
  collab: CollabPlaybackInfo | null | undefined,
): string | null | undefined {
  if (collab?.compositorActive && collab.compositedIngestKey) {
    return collab.compositedIngestKey;
  }
  return hostIngestKey;
}
