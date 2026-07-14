import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Coins } from "lucide-react";
import { StreamLiveStats } from "@/components/StreamLiveStats";
import { StreamTheater } from "@/components/StreamTheater";
import { StreamChat } from "@/components/StreamChat";
import { StreamSidebar } from "@/components/StreamSidebar";
import { NowPlayingBar } from "@/components/NowPlayingBar";
import { ShareMenu } from "@/components/ShareMenu";
import { StreamPageGuide } from "@/components/StreamPageGuide";
import { SetScorePanel } from "@/components/SetScorePanel";
import { QuestStreamChip } from "@/components/QuestStreamChip";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { genreLabels, DROP_TOKEN_SYMBOL } from "@/lib/constants";
import { isDemoPlayback, resolveLivePlaybackUrl } from "@/lib/streaming";
import { StreamPageLayout } from "@/components/StreamPageLayout";
import { StationBrandAvatar } from "@/components/StationBrandAvatar";
import { getStationBySlug, getLiveStreamForStation } from "@/lib/stations";
import { StreamDetailsEditor } from "@/components/StreamDetailsEditor";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const station = await getStationBySlug(slug);
  if (!station) return { title: "Station — LiveBooth" };
  const live = await getLiveStreamForStation(station.id);
  if (!live) return { title: `${station.name} — LiveBooth` };
  return {
    title: `${live.title} — ${station.name} live`,
    description: station.tagline || `${station.name} is on air now`,
  };
}

export default async function StationLivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const station = await getStationBySlug(slug);
  if (!station) notFound();

  const stream = await getLiveStreamForStation(station.id);
  if (!stream) redirect(`/station/${slug}`);

  const session = await getSessionUser();
  const playbackUrl = resolveLivePlaybackUrl(stream.status, stream.ingestKey, stream.playbackUrl);
  const isStationChannel = stream.stationChannel;
  const isHost = session?.id === stream.djId;
  const isStationOwner = session?.id === station.ownerId;
  const canEditDetails = isHost || isStationOwner;

  const achievements = await prisma.userAchievement.findMany({
    where: { userId: stream.djId, unlockedAt: { not: null } },
    include: { achievement: true },
    take: 8,
  });

  const hostUser = await prisma.user.findUnique({
    where: { id: stream.djId },
    select: { username: true, displayName: true, walletAddress: true },
  });
  if (!hostUser) notFound();

  const displayName = isStationChannel ? station.name : stream.dj.displayName;
  const sharePath = `/station/${station.slug}/live`;

  return (
    <StreamPageLayout
      watch={
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto overscroll-y-contain lg:overflow-hidden lg:border-r lg:border-white/[0.06]">
          <div className="bg-black relative shrink-0">
            <StreamTheater
              streamId={stream.id}
              djName={displayName}
              streamTitle={stream.title}
              initialPeak={stream.peakViewers}
              playbackUrl={playbackUrl}
              startedAt={stream.startedAt?.toISOString()}
              demoPlayback={isDemoPlayback(playbackUrl)}
              station={{
                slug: station.slug,
                name: station.name,
                avatar: station.avatar,
                avatarUrl: station.avatarUrl,
              }}
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
                <Link href={`/station/${station.slug}`}>
                  <StationBrandAvatar
                    name={station.name}
                    avatar={station.avatar}
                    avatarUrl={station.avatarUrl}
                    size="md"
                    className="hover:scale-105 transition-transform"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/station/${station.slug}`}
                    className="font-bold text-base sm:text-lg hover:text-[#53fc18] transition-colors truncate block"
                  >
                    {station.name}
                  </Link>
                  <p className="text-sm text-zinc-500 truncate">
                    {isStationChannel ? (
                      <span className="text-[#53fc18]">Station video channel</span>
                    ) : (
                      <>
                        <Link href={`/dj/${stream.dj.username}`} className="hover:text-[#53fc18]">
                          {stream.dj.displayName}
                        </Link>
                        {" · resident show"}
                      </>
                    )}
                  </p>
                  {canEditDetails ? (
                    <div className="mt-1">
                      <StreamDetailsEditor
                        streamId={stream.id}
                        initialTitle={stream.title}
                        initialDescription={stream.description}
                        canEdit
                        variant="live"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-zinc-500 truncate">{stream.title}</p>
                      {stream.description ? (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2 whitespace-pre-wrap">
                          {stream.description}
                        </p>
                      ) : null}
                    </>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-zinc-500">
                    <StreamLiveStats streamId={stream.id} initialPeak={stream.peakViewers} />
                    <span className="flex items-center gap-1 text-[#53fc18]">
                      <Coins className="h-3 w-3 shrink-0" /> {stream.totalTips} {DROP_TOKEN_SYMBOL}
                    </span>
                    <span>{genreLabels[stream.genre as keyof typeof genreLabels] ?? stream.genre}</span>
                  </div>
                </div>
              </div>
              <ShareMenu
                kind="station"
                path={sharePath}
                stationName={station.name}
                username={station.slug}
                label="Share"
                variant="primary"
                className="w-full sm:w-auto"
              />
            </div>
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
              djName={displayName}
              djUsername={hostUser.username}
              djWalletAddress={hostUser.walletAddress}
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
