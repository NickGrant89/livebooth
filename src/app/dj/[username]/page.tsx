import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Radio, Users, Coins, Trophy, Settings } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { SubscribeButton } from "@/components/SubscribeButton";
import { StakePanel } from "@/components/StakePanel";
import { DjArchiveList, DjProfileTabs } from "@/components/DjArchiveList";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { genreLabels, DROP_TOKEN_SYMBOL, DAY_LABELS, getCreatorTypeLabel } from "@/lib/constants";
import { ShareProfileButton } from "@/components/ShareLiveButton";
import { djProfileMetadata } from "@/lib/metadata-share";
import { ProfileOnChainStrip } from "@/components/ProfileOnChainStrip";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { profileImageSrc } from "@/lib/profile-images";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const dj = await prisma.user.findUnique({ where: { username } });
  if (!dj) return { title: "DJ — LiveBooth" };
  const live = await prisma.stream.findFirst({
    where: { djId: dj.id, status: "live" },
  });
  return djProfileMetadata({
    username,
    displayName: dj.displayName,
    bio: dj.bio,
    isLive: Boolean(live),
  });
}

export default async function DJProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab = "overview" } = await searchParams;
  const session = await getSessionUser();
  const dj = await prisma.user.findUnique({
    where: { username },
    include: {
      balance: true,
      achievements: {
        where: { unlockedAt: { not: null } },
        include: { achievement: true },
      },
      _count: { select: { followers: true } },
    },
  });
  if (!dj) notFound();

  const [liveStream, archiveStreams] = await Promise.all([
    prisma.stream.findFirst({
      where: { djId: dj.id, status: "live" },
    }),
    prisma.stream.findMany({
      where: { djId: dj.id, status: "ended", startedAt: { not: null } },
      orderBy: { endedAt: "desc" },
      take: 50,
    }),
  ]);

  const lastSet = archiveStreams.find((s) => s.setGrade);
  const genres = JSON.parse(dj.genres || "[]") as string[];
  const isOwnProfile = session?.id === dj.id;
  const isDj = dj.role === "dj" || dj.role === "admin";

  const bannerSrc = profileImageSrc(dj.bannerUrl);

  const fanCrate =
    dj.role === "fan"
      ? await prisma.trackUnlock.findMany({
          where: { userId: dj.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { stream: { include: { dj: true } } },
        })
      : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-2xl border border-white/5 bg-[#141416] overflow-hidden">
        <div className="relative z-0 h-32 shrink-0 overflow-hidden bg-gradient-to-r from-[#53fc18]/20 via-[#00d4aa]/10 to-purple-500/20">
          {bannerSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
        <div className="relative z-10 px-4 sm:px-6 pb-6">
          <div className="flex items-end justify-between gap-3 -mt-10 sm:-mt-12 mb-4">
            <div className="relative z-10 shrink-0">
              <ProfileAvatar
                displayName={dj.displayName}
                avatar={dj.avatar}
                avatarUrl={dj.avatarUrl}
                size="lg"
                borderClassName="border-4 border-[#141416]"
              />
            </div>
            <div className="flex gap-2 flex-wrap justify-end pb-0.5 min-w-0">
              {isOwnProfile && (
                <Link
                  href="/settings"
                  className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#141416]/90 px-3 sm:px-4 py-2 text-sm text-zinc-200 hover:bg-white/10 backdrop-blur-sm"
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  Edit profile
                </Link>
              )}
              <ShareProfileButton
                username={dj.username}
                djName={dj.displayName}
                isLive={Boolean(liveStream)}
              />
              {liveStream && (
                <Link href={`/stream/${dj.username}`} className="rounded-lg bg-red-500 px-3 sm:px-4 py-2 text-sm font-bold text-white whitespace-nowrap">
                  Watch Live
                </Link>
              )}
              {!isOwnProfile && <FollowButton username={dj.username} />}
              {!liveStream && isDj && !isOwnProfile && (
                <SubscribeButton djUsername={dj.username} />
              )}
            </div>
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{dj.displayName}</h1>
                {isDj && (
                  <span className="rounded-full bg-[#53fc18]/10 border border-[#53fc18]/30 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#53fc18]">
                    {getCreatorTypeLabel(dj.creatorType)}
                  </span>
                )}
                {liveStream && (
                  <Link href={`/stream/${dj.username}`} className="flex items-center gap-1 rounded-full bg-red-500/90 px-2.5 py-0.5 text-xs font-bold uppercase">
                    <Radio className="h-3 w-3 animate-pulse" />
                    Live
                  </Link>
                )}
              </div>
              <p className="text-sm text-zinc-300">@{dj.username}</p>
              {lastSet?.setGrade && !liveStream && (
                <p className="text-xs text-[#15CFF4] mt-1">
                  Last set: Grade {lastSet.setGrade}
                  {lastSet.setScore != null ? ` · ${lastSet.setScore.toLocaleString()} pts` : ""}
                </p>
              )}
              {dj.streamStreak > 1 && (
                <p className="text-xs text-amber-400 mt-1">🔥 {dj.streamStreak}-week streaming streak</p>
              )}
              {dj.weeklySlotDay != null && dj.weeklySlotHour != null && (
                <p className="text-xs text-zinc-500 mt-1">
                  📅 {dj.weeklySlotLabel || "Weekly set"} — {DAY_LABELS[dj.weeklySlotDay]} {dj.weeklySlotHour}:00 UTC
                </p>
              )}
            </div>
          <p className="mt-3 text-zinc-300">{dj.bio || (isOwnProfile ? "Add a bio in settings →" : "")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {genres.map((g: string) => (
              <span key={g} className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs">
                {genreLabels[g] ?? g}
              </span>
            ))}
          </div>
          {isDj && (
            <ProfileOnChainStrip
              walletAddress={dj.walletAddress}
              isOwnProfile={isOwnProfile}
              isDj={isDj}
            />
          )}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/5 p-4 text-center">
              <Users className="h-5 w-5 text-[#53fc18] mx-auto mb-1" />
              <div className="text-xl font-bold">{dj._count.followers}</div>
              <div className="text-xs text-zinc-500">Followers</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4 text-center">
              <Coins className="h-5 w-5 text-[#53fc18] mx-auto mb-1" />
              <div className="text-xl font-bold text-[#53fc18]">{Math.round(dj.balance?.totalEarned ?? 0)}</div>
              <div className="text-xs text-zinc-500">{DROP_TOKEN_SYMBOL} Earned</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4 text-center">
              <Trophy className="h-5 w-5 text-[#53fc18] mx-auto mb-1" />
              <div className="text-xl font-bold">{dj.achievements.length}</div>
              <div className="text-xs text-zinc-500">Achievements</div>
            </div>
          </div>
        </div>
      </div>

      {isDj && (
        <DjProfileTabs
          username={dj.username}
          activeTab={tab}
          isLive={Boolean(liveStream)}
        />
      )}

      {tab === "archive" && isDj ? (
        <section>
          <h2 className="text-lg font-bold mb-4">Set archive</h2>
          <p className="text-sm text-zinc-500 mb-4">
            {archiveStreams.length} replay{archiveStreams.length === 1 ? "" : "s"}
            {liveStream ? " · go live to add more" : ""}
          </p>
          <DjArchiveList streams={archiveStreams} liveStreamId={liveStream?.id} canDelete={isOwnProfile && isDj} />
        </section>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-bold mb-4">Achievements</h2>
            <div className="flex flex-wrap gap-4">
              {dj.achievements.map((ua) => (
                <div key={ua.id} className="flex flex-col items-center gap-1">
                  <span className="text-3xl">{ua.achievement.icon}</span>
                  <span className="text-xs text-zinc-500 text-center max-w-[80px]">{ua.achievement.name}</span>
                </div>
              ))}
              {dj.achievements.length === 0 && (
                <p className="text-sm text-zinc-500">No achievements unlocked yet.</p>
              )}
            </div>
          </section>

          {isDj && !isOwnProfile && <StakePanel djUsername={dj.username} />}

          {isDj && archiveStreams.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Recent sets</h2>
                <Link href={`/dj/${dj.username}?tab=archive`} className="text-xs text-[#53fc18] hover:underline">
                  View all →
                </Link>
              </div>
              <DjArchiveList streams={archiveStreams.slice(0, 5)} />
            </section>
          )}
        </>
      )}

      {fanCrate.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold mb-4">Track crate</h2>
          <div className="space-y-2">
            {fanCrate.map((u) => (
              <div key={u.id} className="rounded-lg border border-white/5 bg-[#141416] px-4 py-3 text-sm">
                <p className="font-medium">{u.trackTitle} — {u.trackArtist}</p>
                <p className="text-xs text-zinc-500">from {u.stream.dj.displayName}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
