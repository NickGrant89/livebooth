import "server-only";

import { prisma } from "./db";
import {
  deactivateCollabCompositor,
  resolveCollabViewerPlaybackUrl,
  tryActivateCollabCompositor,
} from "./collab-compositor";
import { hlsManifestReady } from "./hls-playback";
import { getHlsPlaybackUrl } from "./streaming";
import { isLiveKitConfigured } from "./livekit";

export type CollabPlaybackState = {
  playbackUrl: string | null | undefined;
  compositorActive: boolean;
  compositorPending: boolean;
  collabPartner: {
    name: string;
    playbackUrl: string;
    ingestKey: string | null;
  } | null;
};

async function mixManifestReady(compositedIngestKey: string): Promise<boolean> {
  const mixUrl = getHlsPlaybackUrl(compositedIngestKey);
  if (!mixUrl) return false;
  return hlsManifestReady(mixUrl);
}

/** Clear compositor flag when mix never appeared (stale WebRTC/FFmpeg attempt). */
async function clearStaleCompositorIfNeeded(
  collabId: string,
  compositedIngestKey: string,
  compositorStartedAt: Date | null,
) {
  if (!compositorStartedAt) return;
  const ageMs = Date.now() - compositorStartedAt.getTime();
  if (ageMs < 45_000) return;
  if (await mixManifestReady(compositedIngestKey)) return;
  await deactivateCollabCompositor(collabId);
}

async function resolveLiveCollabPlayback(
  stream: {
    status: string;
    ingestKey: string | null;
    playbackUrl: string | null;
  },
  collab: {
    id: string;
    status: string;
    compositorActive: boolean;
    compositedIngestKey: string | null;
    compositorStartedAt: Date | null;
    partnerDjId: string;
    partnerStream: { status: string; ingestKey: string | null; playbackUrl: string | null } | null;
  } | null,
): Promise<Pick<CollabPlaybackState, "playbackUrl" | "compositorActive" | "compositorPending">> {
  const hostUrl = resolveCollabViewerPlaybackUrl(
    stream.status,
    stream.ingestKey,
    stream.playbackUrl,
    null,
  );

  if (collab?.status !== "active") {
    return { playbackUrl: hostUrl, compositorActive: false, compositorPending: false };
  }

  if (collab.compositorActive && collab.compositedIngestKey) {
    if (await mixManifestReady(collab.compositedIngestKey)) {
      return {
        playbackUrl: getHlsPlaybackUrl(collab.compositedIngestKey),
        compositorActive: true,
        compositorPending: false,
      };
    }

    await clearStaleCompositorIfNeeded(
      collab.id,
      collab.compositedIngestKey,
      collab.compositorStartedAt,
    );

    return {
      playbackUrl: hostUrl,
      compositorActive: false,
      compositorPending: true,
    };
  }

  return { playbackUrl: hostUrl, compositorActive: false, compositorPending: false };
}

export async function getCollabPlaybackState(
  streamId: string,
  options?: { tryActivate?: boolean },
): Promise<CollabPlaybackState | null> {
  const stream = await prisma.stream.findFirst({
    where: { id: streamId, status: "live" },
    include: {
      collab: { include: { partnerStream: true } },
    },
  });
  if (!stream) return null;

  let collab = stream.collab;

  if (
    options?.tryActivate &&
    !isLiveKitConfigured() &&
    collab?.status === "active" &&
    !collab.compositorActive &&
    collab.partnerStream?.status === "live"
  ) {
    await tryActivateCollabCompositor(collab.id);
    collab = await prisma.streamCollab.findUnique({
      where: { id: collab.id },
      include: { partnerStream: true },
    });
  }

  const playback = await resolveLiveCollabPlayback(stream, collab);

  let collabPartner: CollabPlaybackState["collabPartner"] = null;
  if (
    collab?.status === "active" &&
    !playback.compositorActive &&
    collab.partnerStream?.status === "live"
  ) {
    const partner = await prisma.user.findUnique({
      where: { id: collab.partnerDjId },
      select: { displayName: true },
    });
    const partnerUrl = resolveCollabViewerPlaybackUrl(
      collab.partnerStream.status,
      collab.partnerStream.ingestKey,
      collab.partnerStream.playbackUrl,
      null,
    );
    if (partnerUrl) {
      collabPartner = {
        name: partner?.displayName ?? "Partner",
        playbackUrl: partnerUrl,
        ingestKey: collab.partnerStream.ingestKey,
      };
    }
  }

  return {
    playbackUrl: playback.playbackUrl,
    compositorActive: playback.compositorActive,
    compositorPending: playback.compositorPending,
    collabPartner,
  };
}
