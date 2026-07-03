import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VodReplay } from "@/components/VodReplay";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getVodAccess } from "@/lib/staker-perks";
import { isDemoPlayback, isFilePlaybackUrl } from "@/lib/streaming";
import {
  findLatestRemoteRecordingFilename,
  getRecordingPublicUrl,
  isRemoteRecordingEnabled,
  normalizeVodPlaybackUrl,
  resolveRecordingVodUrl,
} from "@/lib/vod-recording";
import { computeSetScore } from "@/lib/set-score";
import { vodMetadata } from "@/lib/metadata-share";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const stream = await prisma.stream.findUnique({
    where: { id },
    include: { dj: true },
  });
  if (!stream || stream.status !== "ended") return { title: "Replay — LiveBooth" };
  return vodMetadata({
    streamId: id,
    djName: stream.dj.displayName,
    title: stream.title,
  });
}

export default async function VODPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stream = await prisma.stream.findUnique({
    where: { id },
    include: {
      dj: true,
      station: { select: { slug: true, ownerId: true } },
      highlights: { orderBy: { timestampMs: "asc" } },
    },
  });
  if (!stream || stream.status !== "ended") notFound();

  const session = await getSessionUser();
  const vodAccess = await getVodAccess(
    session?.id,
    {
      djId: stream.djId,
      stationId: stream.stationId,
      endedAt: stream.endedAt,
      station: stream.station,
    },
    session?.role,
  );

  let setGrade = stream.setGrade;
  let setScore = stream.setScore;
  if (!setGrade) {
    const scored = await computeSetScore(stream.id);
    if (scored) {
      setGrade = scored.setGrade;
      setScore = scored.setScore;
    }
  }

  let vodUrl = stream.vodUrl;
  let playbackUrl: string | null = vodUrl ?? stream.playbackUrl;

  if (stream.ingestKey && !isFilePlaybackUrl(playbackUrl)) {
    let repaired = await resolveRecordingVodUrl(stream.ingestKey);
    if (!repaired && isRemoteRecordingEnabled()) {
      const filename = await findLatestRemoteRecordingFilename(stream.ingestKey);
      if (filename) repaired = getRecordingPublicUrl(stream.ingestKey, filename);
    }
    if (repaired) {
      vodUrl = repaired;
      playbackUrl = repaired;
      if (stream.vodUrl !== repaired) {
        await prisma.stream.update({
          where: { id: stream.id },
          data: { vodUrl: repaired },
        });
      }
    }
  }

  if (playbackUrl && !isFilePlaybackUrl(playbackUrl) && !isDemoPlayback(playbackUrl)) {
    playbackUrl = null;
  }

  playbackUrl = normalizeVodPlaybackUrl(playbackUrl);

  const demoPlayback = Boolean(playbackUrl && isDemoPlayback(playbackUrl) && !isFilePlaybackUrl(playbackUrl));
  const recordingUnavailable = !playbackUrl && !demoPlayback;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href={`/dj/${stream.dj.username}`} className="text-sm text-zinc-400 hover:text-white mb-4 inline-block">
        ← {stream.dj.displayName}
      </Link>
      <VodReplay
        streamId={id}
        title={stream.title}
        djName={stream.dj.displayName}
        djUsername={stream.dj.username}
        peakViewers={stream.peakViewers}
        totalTips={stream.totalTips}
        playbackUrl={playbackUrl ?? ""}
        demoPlayback={demoPlayback}
        recordingUnavailable={recordingUnavailable}
        highlights={stream.highlights.map((h) => ({
          id: h.id,
          timestampMs: h.timestampMs,
          username: h.username,
          amount: h.amount,
        }))}
        setGrade={setGrade}
        setScore={setScore}
        earlyAccessBlocked={
          !vodAccess.allowed && vodAccess.reason === "early_access"
            ? { publicAt: vodAccess.publicAt, stationSlug: vodAccess.stationSlug }
            : undefined
        }
      />
    </div>
  );
}
