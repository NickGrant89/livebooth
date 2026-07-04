import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Coins } from "lucide-react";
import { StreamLiveStats } from "@/components/StreamLiveStats";
import { StreamTheater } from "@/components/StreamTheater";
import { StreamChat } from "@/components/StreamChat";
import { StreamSidebar } from "@/components/StreamSidebar";
import { FollowButton } from "@/components/FollowButton";
import { SubscribeButton } from "@/components/SubscribeButton";
import { NowPlayingBar } from "@/components/NowPlayingBar";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { genreLabels, DROP_TOKEN_SYMBOL } from "@/lib/constants";
import { isDemoPlayback, resolveLivePlaybackUrl } from "@/lib/streaming";
import { RequestQueue } from "@/components/RequestQueue";
import { StreamPageGuide } from "@/components/StreamPageGuide";
import { QuestStreamChip } from "@/components/QuestStreamChip";
import { SetScorePanel } from "@/components/SetScorePanel";
import { StreamPageLayout } from "@/components/StreamPageLayout";
import { ShareLiveButton } from "@/components/ShareLiveButton";
import { streamMetadata } from "@/lib/metadata-share";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const dj = await prisma.user.findUnique({ where: { username } });
  if (!dj) return { title: "Stream — LiveBooth" };
  const stream = await prisma.stream.findFirst({
    where: { djId: dj.id, status: "live" },
  });
  if (!stream) return { title: `${dj.displayName} — LiveBooth` };
  return streamMetadata({
    username,
    djName: dj.displayName,
    title: stream.title,
    genre: genreLabels[stream.genre],
    peakViewers: stream.peakViewers,
  });
}

export default async function StreamPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await getSessionUser();
  const dj = await prisma.user.findUnique({ where: { username } });
  if (!dj) redirect("/");

  const stream = await prisma.stream.findFirst({
    where: { djId: dj.id, status: "live" },
    include: {
      nowPlaying: true,
      collab: { include: { partnerStream: true } },
      station: true,
    },
  });
  if (!stream) redirect(`/dj/${username}`);

  const playbackUrl = resolveLivePlaybackUrl(stream.status, stream.ingestKey, stream.playbackUrl);

  const partnerUser =
    stream.collab?.status === "active"
      ? await prisma.user.findUnique({
          where: { id: stream.collab.partnerDjId },
          select: { displayName: true, username: true },
        })
      : null;

  const partnerLive =
    stream.collab?.status === "active" &&
    stream.collab.partnerStream?.status === "live"
      ? {
          name: partnerUser?.displayName ?? "Partner",
          playbackUrl: resolveLivePlaybackUrl(
            stream.collab.partnerStream.status,
            stream.collab.partnerStream.ingestKey,
            stream.collab.partnerStream.playbackUrl,
          )!,
          ingestKey: stream.collab.partnerStream.ingestKey,
        }
      : null;

  const achievements = await prisma.userAchievement.findMany({
    where: { userId: dj.id, unlockedAt: { not: null } },
    include: { achievement: true },
    take: 8,
  });

  const partner = partnerUser;

  const isHost = session?.id === dj.id;

  return (
    <StreamPageLayout
      watch={
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto lg:border-r lg:border-white/[0.06]">
          <div className="bg-black relative shrink-0">
            <StreamTheater
              streamId={stream.id}
              djName={dj.displayName}
              streamTitle={stream.title}
              initialPeak={stream.peakViewers}
              playbackUrl={playbackUrl}
              startedAt={stream.startedAt?.toISOString()}
              demoPlayback={isDemoPlayback(playbackUrl)}
              station={
                stream.station
                  ? {
                      slug: stream.station.slug,
                      name: stream.station.name,
                      avatar: stream.station.avatar,
                    }
                  : null
              }
              collabPartner={partnerLive}
            />
          </div>

          {stream.nowPlaying && (
            <NowPlayingBar
              streamId={stream.id}
              title={stream.nowPlaying.title}
              artist={stream.nowPlaying.artist}
              bpm={stream.nowPlaying.bpm}
            />
          )}

          <div className="glass border-t border-white/[0.06] p-3 sm:p-4 lg:p-5">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-start justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Link href={`/dj/${dj.username}`}>
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#53fc18] to-[#00f0ff] text-sm font-bold text-black shrink-0 hover:scale-105 transition-transform">
                    {dj.avatar}
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/dj/${dj.username}`} className="font-bold text-base sm:text-lg hover:text-[#53fc18] transition-colors truncate block">
                    {dj.displayName}
                  </Link>
                  {partner && (
                    <span className="text-zinc-500 text-sm"> + {partner.displayName}</span>
                  )}
                  <p className="text-sm text-zinc-500 truncate">{stream.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-zinc-500">
                    <StreamLiveStats streamId={stream.id} initialPeak={stream.peakViewers} />
                    <span className="flex items-center gap-1 text-[#53fc18]">
                      <Coins className="h-3 w-3 shrink-0" /> {stream.totalTips} {DROP_TOKEN_SYMBOL}
                    </span>
                    <span>{genreLabels[stream.genre]}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:shrink-0">
                <ShareLiveButton
                  username={dj.username}
                  djName={dj.displayName}
                  setTitle={stream.title}
                  variant="primary"
                  label="Share"
                  className="w-full sm:w-auto"
                />
                <FollowButton username={dj.username} />
                <SubscribeButton djUsername={dj.username} />
              </div>
            </div>
            {isHost && (
              <div className="mt-4">
                <RequestQueue streamId={stream.id} compact />
              </div>
            )}
            {!isHost && <QuestStreamChip streamId={stream.id} />}
            {!isHost && (
              <div className="mt-3 lg:hidden">
                <SetScorePanel streamId={stream.id} variant="fan" />
              </div>
            )}
          </div>
        </div>
      }
      chat={
        <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col flex-1 lg:flex-none border-white/[0.06] bg-[#0a0a0c] shrink-0 min-w-0 min-h-0 overflow-hidden">
          <StreamPageGuide isHost={isHost} />
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <StreamChat
              streamId={stream.id}
              djName={dj.displayName}
              djUsername={dj.username}
              djWalletAddress={dj.walletAddress}
              nowPlaying={stream.nowPlaying}
              startedAt={stream.startedAt?.toISOString()}
              isHost={isHost}
            />
          </div>
          <StreamSidebar
            className="hidden lg:block"
            achievements={achievements.map((a) => a.achievement)}
            streamId={stream.id}
          />
        </div>
      }
    />
  );
}
