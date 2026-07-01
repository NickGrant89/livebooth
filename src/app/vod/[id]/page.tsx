import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VodReplay } from "@/components/VodReplay";
import { prisma } from "@/lib/db";
import { isDemoPlayback, isFilePlaybackUrl } from "@/lib/streaming";
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
    include: { dj: true, highlights: { orderBy: { timestampMs: "asc" } } },
  });
  if (!stream || stream.status !== "ended") notFound();

  const playbackUrl = stream.vodUrl ?? stream.playbackUrl;
  const demoPlayback = isDemoPlayback(playbackUrl) && !isFilePlaybackUrl(playbackUrl);

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
        highlights={stream.highlights.map((h) => ({
          id: h.id,
          timestampMs: h.timestampMs,
          username: h.username,
          amount: h.amount,
        }))}
        setGrade={stream.setGrade}
        setScore={stream.setScore}
      />
    </div>
  );
}
