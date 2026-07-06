import "server-only";

import { prisma } from "./db";
import {
  resolveCollabViewerPlaybackUrl,
  tryActivateCollabCompositor,
} from "./collab-compositor";

export type CollabPlaybackState = {
  playbackUrl: string | null | undefined;
  compositorActive: boolean;
  collabPartner: {
    name: string;
    playbackUrl: string;
    ingestKey: string | null;
  } | null;
};

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

  const collabPlayback =
    collab?.status === "active"
      ? {
          compositorActive: collab.compositorActive,
          compositedIngestKey: collab.compositedIngestKey,
        }
      : null;

  const playbackUrl = resolveCollabViewerPlaybackUrl(
    stream.status,
    stream.ingestKey,
    stream.playbackUrl,
    collabPlayback,
  );

  let collabPartner: CollabPlaybackState["collabPartner"] = null;
  if (
    collab?.status === "active" &&
    !collab.compositorActive &&
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
    playbackUrl,
    compositorActive: Boolean(collab?.compositorActive),
    collabPartner,
  };
}
