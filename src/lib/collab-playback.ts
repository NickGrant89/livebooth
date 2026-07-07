import "server-only";

import { prisma } from "./db";
import {
  resolveCollabViewerPlaybackUrl,
  tryActivateCollabCompositor,
} from "./collab-compositor";
import { hlsManifestReady, upstreamIngestManifestReady } from "./hls-playback";
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

/** Mix HLS manifest check — direct upstream URL so Vercel server checks work reliably. */
async function mixManifestReady(compositedIngestKey: string): Promise<boolean> {
  if (await upstreamIngestManifestReady(compositedIngestKey)) return true;
  const mixUrl = getHlsPlaybackUrl(compositedIngestKey);
  if (!mixUrl) return false;
  return hlsManifestReady(mixUrl);
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

  const hostHasSignal = stream.ingestKey
    ? await upstreamIngestManifestReady(stream.ingestKey)
    : hostUrl
      ? await hlsManifestReady(hostUrl)
      : false;

  // WebRTC collab: fans watch egress mix — show building overlay until mix is publishing.
  if (isLiveKitConfigured() && !collab.compositorActive) {
    const mixKey = stream.ingestKey ? `${stream.ingestKey}_mix` : null;
    const mixReady = mixKey ? await mixManifestReady(mixKey) : false;
    if (!mixReady && !hostHasSignal) {
      return {
        playbackUrl: hostUrl,
        compositorActive: false,
        compositorPending: true,
      };
    }
  }

  if (collab.compositorActive && collab.compositedIngestKey) {
    if (await mixManifestReady(collab.compositedIngestKey)) {
      return {
        playbackUrl: getHlsPlaybackUrl(collab.compositedIngestKey),
        compositorActive: true,
        compositorPending: false,
      };
    }

    // Mix flagged in DB but HLS not ready yet — still serve mix URL so player can retry.
    return {
      playbackUrl: getHlsPlaybackUrl(collab.compositedIngestKey),
      compositorActive: true,
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
