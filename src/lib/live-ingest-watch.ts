import { prisma } from "@/lib/db";
import { evaluateAchievements } from "@/lib/achievements";
import { computeSetScore } from "@/lib/set-score";
import { buildStreamRecap, updateDjStreak } from "@/lib/retention";
import { upstreamIngestManifestReady } from "@/lib/hls-playback";
import { cancelStreamPreview, endStreamSession, isLiveBoothIngestKey } from "@/lib/streaming";

/** How long ingest can be down after last healthy signal before auto-ending (matches client hook). */
export const INGEST_LOST_MS = 60_000;

export async function markIngestHealthy(streamId: string) {
  await prisma.stream.update({
    where: { id: streamId },
    data: { ingestLastSeenAt: new Date() },
  });
}

export async function isIngestFeedReady(ingestKey: string | null | undefined): Promise<boolean> {
  if (!ingestKey) return false;
  if (isLiveBoothIngestKey(ingestKey)) {
    return upstreamIngestManifestReady(ingestKey);
  }
  // Livepeer / other providers — no VPS manifest probe; skip server-side auto-end.
  return true;
}

async function finalizeLiveStreamEnd(streamId: string, djId: string) {
  await endStreamSession(streamId, djId);
  await updateDjStreak(djId);
  await computeSetScore(streamId);
  await buildStreamRecap(streamId);
  await evaluateAchievements(djId);
}

export async function processLiveIngestWatch(): Promise<{
  checked: number;
  endedLive: number;
  cancelledPreview: number;
}> {
  const streams = await prisma.stream.findMany({
    where: {
      status: { in: ["live", "preparing"] },
      ingestKey: { not: null },
    },
    select: {
      id: true,
      djId: true,
      status: true,
      ingestKey: true,
      ingestLastSeenAt: true,
    },
  });

  const now = Date.now();
  let endedLive = 0;
  let cancelledPreview = 0;

  for (const stream of streams) {
    const feedReady = await isIngestFeedReady(stream.ingestKey);
    if (feedReady) {
      await markIngestHealthy(stream.id);
      continue;
    }

    const lastSeen = stream.ingestLastSeenAt?.getTime();
    if (!lastSeen || now - lastSeen < INGEST_LOST_MS) continue;

    if (stream.status === "preparing") {
      await cancelStreamPreview(stream.id, stream.djId);
      cancelledPreview += 1;
    } else {
      await finalizeLiveStreamEnd(stream.id, stream.djId);
      endedLive += 1;
    }
  }

  return { checked: streams.length, endedLive, cancelledPreview };
}
