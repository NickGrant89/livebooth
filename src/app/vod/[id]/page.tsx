import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VodReplay } from "@/components/VodReplay";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getVodAccess } from "@/lib/staker-perks";
import { isDemoPlayback, isFilePlaybackUrl, isVodPlaybackUrl } from "@/lib/streaming";
import {
  resolveEndedStreamPlaybackUrl,
  isVodLikelyProcessing,
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
      station: { select: { slug: true, ownerId: true, name: true } },
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
      dj: { username: stream.dj.username },
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

  if (stream.ingestKey) {
    const resolved = await resolveEndedStreamPlaybackUrl(stream.ingestKey, playbackUrl);
    if (resolved) {
      vodUrl = resolved;
      playbackUrl = resolved;
      if (stream.vodUrl !== resolved) {
        await prisma.stream.update({
          where: { id: stream.id },
          data: { vodUrl: resolved },
        });
      }
    }
  }

  if (playbackUrl && !isVodPlaybackUrl(playbackUrl)) {
    playbackUrl = null;
  }

  const demoPlayback = Boolean(playbackUrl && isDemoPlayback(playbackUrl) && !isFilePlaybackUrl(playbackUrl));
  const recordingUnavailable = !playbackUrl && !demoPlayback;
  const recordingProcessing =
    recordingUnavailable &&
    isVodLikelyProcessing(stream.endedAt, stream.ingestKey, stream.vodUrl, stream.playbackUrl);

  const displayName = stream.stationChannel && stream.station?.name
    ? stream.station.name
    : stream.dj.displayName;
  const backHref = stream.stationChannel && stream.station?.slug
    ? `/station/${stream.station.slug}`
    : `/dj/${stream.dj.username}`;
  const backLabel = stream.stationChannel && stream.station?.name
    ? stream.station.name
    : stream.dj.displayName;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href={backHref} className="text-sm text-zinc-400 hover:text-white mb-4 inline-block">
        ← {backLabel}
      </Link>
      <VodReplay
        streamId={id}
        title={stream.title}
        djName={displayName}
        djUsername={stream.dj.username}
        peakViewers={stream.peakViewers}
        totalTips={stream.totalTips}
        playbackUrl={playbackUrl ?? ""}
        demoPlayback={demoPlayback}
        recordingUnavailable={recordingUnavailable}
        recordingProcessing={recordingProcessing}
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
            ? {
                publicAt: vodAccess.publicAt,
                stationSlug: vodAccess.stationSlug,
                djUsername: vodAccess.djUsername,
                accessType: vodAccess.accessType,
              }
            : undefined
        }
        showStakerCta={vodAccess.allowed}
        stationSlug={stream.station?.slug ?? null}
      />
    </div>
  );
}
