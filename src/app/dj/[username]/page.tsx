import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Radio, Users, Coins, Trophy, Settings, Heart, Crown, UserPlus } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { SubscribeButton } from "@/components/SubscribeButton";
import { StreamLikeButton } from "@/components/StreamLikeButton";
import { StakePanel } from "@/components/StakePanel";
import { DjArchiveList, DjProfileTabs } from "@/components/DjArchiveList";
import { FeaturedReplayCard } from "@/components/FeaturedReplayCard";
import { ProfileSocialLinks } from "@/components/ProfileSocialLinks";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { enrichArchiveStreams } from "@/lib/vod-recording";
import { getStationAffiliationForUser } from "@/lib/stations";
import { getDjStakeTotal } from "@/lib/staking";
import { pruneDjArchive } from "@/lib/archive-cleanup";
import { genreLabels, DROP_TOKEN_SYMBOL, getCreatorTypeLabel } from "@/lib/constants";
import { ShareProfileButton } from "@/components/ShareLiveButton";
import { djProfileMetadata } from "@/lib/metadata-share";
import { ProfileOnChainStrip } from "@/components/ProfileOnChainStrip";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { profileImageSrc } from "@/lib/profile-images";
import { getDjTotalLikes } from "@/lib/stream-likes";
import { socialLinksForDisplay } from "@/lib/profile-social";
import { formatNextWeeklySlot } from "@/lib/weekly-slot";

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
      _count: { select: { followers: true, following: true } },
    },
  });
  if (!dj) notFound();

  const isOwnProfile = session?.id === dj.id;
  const isCreator = dj.role === "dj" || dj.role === "admin" || dj.role === "station";
  const isDj = dj.role === "dj" || dj.role === "admin";

  if (isOwnProfile && tab === "archive") {
    await pruneDjArchive(dj.id);
  }

  const [liveStream, rawArchiveStreams, stationAffiliation, totalLikes, vipSubCount, fanFollowing, fanMemberships] =
    await Promise.all([
    prisma.stream.findFirst({
      where: { djId: dj.id, status: "live" },
    }),
    prisma.stream.findMany({
      where: { djId: dj.id, status: "ended", startedAt: { not: null } },
      orderBy: { endedAt: "desc" },
      take: 50,
    }),
    getStationAffiliationForUser(dj.id),
    getDjTotalLikes(dj.id),
    isCreator ? getDjStakeTotal(dj.id).then((t) => t.stakers) : Promise.resolve(0),
    dj.role === "fan"
      ? prisma.follow.findMany({
          where: { followerId: dj.id },
          orderBy: { createdAt: "desc" },
          take: 12,
          include: {
            following: {
              select: { username: true, displayName: true, avatar: true, role: true },
            },
          },
        })
      : Promise.resolve([]),
    dj.role === "fan"
      ? prisma.djStake.findMany({
          where: { fanId: dj.id, status: "active" },
          include: {
            dj: { select: { username: true, displayName: true, avatar: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const archiveStreams = await enrichArchiveStreams(rawArchiveStreams, {
    resolveUrls: true,
    resolveLimit: 15,
  });

  const lastSet = archiveStreams.find((s) => s.setGrade);
  const genres = JSON.parse(dj.genres || "[]") as string[];
  const socialLinks = socialLinksForDisplay(dj.socialLinks);
  const featuredStream = dj.featuredStreamId
    ? archiveStreams.find(
        (s) =>
          s.id === dj.featuredStreamId &&
          (s.replayState === "ready" || s.hasReplay || s.vodUrl || s.playbackUrl),
      )
    : undefined;
  const roleLabel =
    dj.role === "station"
      ? "Radio"
      : isDj
        ? getCreatorTypeLabel(dj.creatorType)
        : null;

  const profileActions = (
    <>
      {isOwnProfile && isCreator && !liveStream && (
        <Link
          href="/go-live"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#53fc18] px-3 py-2.5 text-sm font-bold text-black whitespace-nowrap"
        >
          <Radio className="h-4 w-4 shrink-0" />
          Go Live
        </Link>
      )}
      {isOwnProfile && (
        <Link
          href="/settings"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#141416] px-3 py-2.5 text-sm text-zinc-200 hover:bg-white/10"
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Edit profile</span>
          <span className="sm:hidden">Edit</span>
        </Link>
      )}
      <ShareProfileButton
        username={dj.username}
        djName={dj.displayName}
        isLive={Boolean(liveStream)}
      />
      {liveStream && (
        <Link
          href={`/stream/${dj.username}`}
          className="rounded-xl bg-red-500 px-3 py-2.5 text-sm font-bold text-white whitespace-nowrap"
        >
          Watch Live
        </Link>
      )}
      {liveStream && <StreamLikeButton streamId={liveStream.id} />}
      {!isOwnProfile && <FollowButton username={dj.username} />}
      {isCreator && !isOwnProfile && <SubscribeButton djUsername={dj.username} />}
    </>
  );

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
      <div className="rounded-2xl border border-white/5 bg-[#141416]">
        <div className="relative h-32 sm:h-36 overflow-hidden rounded-t-2xl bg-gradient-to-r from-[#53fc18]/20 via-[#00d4aa]/10 to-purple-500/20">
          {bannerSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
        <div className="px-4 sm:px-6 pb-6">
          <div className="relative z-10 -mt-14 sm:-mt-16 mb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <ProfileAvatar
                displayName={dj.displayName}
                avatar={dj.avatar}
                avatarUrl={dj.avatarUrl}
                size="2xl"
                borderClassName="border-4 border-[#141416] shadow-lg shadow-black/40"
                className="shrink-0"
              />
              <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                {profileActions}
              </div>
            </div>
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{dj.displayName}</h1>
              {roleLabel && (
                <span className="rounded-full bg-[#53fc18]/10 border border-[#53fc18]/30 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#53fc18]">
                  {roleLabel}
                </span>
              )}
              {liveStream && (
                <Link
                  href={`/stream/${dj.username}`}
                  className="flex items-center gap-1 rounded-full bg-red-500/90 px-2.5 py-0.5 text-xs font-bold uppercase"
                >
                  <Radio className="h-3 w-3 animate-pulse" />
                  Live
                </Link>
              )}
            </div>
            <p className="text-sm text-zinc-300">@{dj.username}</p>
            {stationAffiliation && (
              <Link
                href={`/station/${stationAffiliation.station.slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#53fc18] hover:underline mt-1"
              >
                <Radio className="h-3.5 w-3.5 shrink-0" />
                {stationAffiliation.station.name}
                <span className="text-zinc-500 font-normal">
                  · {stationAffiliation.kind === "owner" ? "Station page" : "Resident on"}
                </span>
              </Link>
            )}
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
                📅 {formatNextWeeklySlot(dj.weeklySlotDay, dj.weeklySlotHour, dj.weeklySlotLabel)}
              </p>
            )}
          </div>
          <p className="mt-3 text-zinc-300">{dj.bio || (isOwnProfile ? "Add a bio in settings →" : "")}</p>
          <ProfileSocialLinks links={socialLinks} />
          <div className="mt-3 flex flex-wrap gap-2">
            {genres.map((g: string) => (
              <span key={g} className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs">
                {genreLabels[g] ?? g}
              </span>
            ))}
          </div>
          {isCreator && (
            <ProfileOnChainStrip
              walletAddress={dj.walletAddress}
              isOwnProfile={isOwnProfile}
              isDj={isCreator}
            />
          )}
          <div
            className={`mt-6 grid gap-4 ${
              isOwnProfile || !isCreator
                ? "grid-cols-2 sm:grid-cols-4"
                : "grid-cols-2 sm:grid-cols-3"
            }`}
          >
            <div className="rounded-xl bg-white/5 p-4 text-center">
              <Users className="h-5 w-5 text-[#53fc18] mx-auto mb-1" />
              <div className="text-xl font-bold">{dj._count.followers}</div>
              <div className="text-xs text-zinc-500">Followers</div>
            </div>
            {!isCreator && (
              <div className="rounded-xl bg-white/5 p-4 text-center">
                <UserPlus className="h-5 w-5 text-cyan-400 mx-auto mb-1" />
                <div className="text-xl font-bold">{dj._count.following}</div>
                <div className="text-xs text-zinc-500">Following</div>
              </div>
            )}
            {isCreator && (
              <div className="rounded-xl bg-white/5 p-4 text-center">
                <Heart className="h-5 w-5 text-pink-400 mx-auto mb-1" />
                <div className="text-xl font-bold">{totalLikes}</div>
                <div className="text-xs text-zinc-500">Stream likes</div>
              </div>
            )}
            {isOwnProfile && (
              <div className="rounded-xl bg-white/5 p-4 text-center">
                <Coins className="h-5 w-5 text-[#53fc18] mx-auto mb-1" />
                <Link href="/wallet" className="block hover:opacity-90">
                  <div className="text-xl font-bold text-[#53fc18]">
                    {Math.round(dj.balance?.totalEarned ?? 0)}
                  </div>
                  <div className="text-xs text-zinc-500">{DROP_TOKEN_SYMBOL} earned</div>
                </Link>
              </div>
            )}
            <div className="rounded-xl bg-white/5 p-4 text-center">
              {isCreator ? (
                <>
                  <Crown className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                  <div className="text-xl font-bold">{vipSubCount}</div>
                  <div className="text-xs text-zinc-500">Members</div>
                </>
              ) : (
                <>
                  <Trophy className="h-5 w-5 text-[#53fc18] mx-auto mb-1" />
                  <div className="text-xl font-bold">{dj.achievements.length}</div>
                  <div className="text-xs text-zinc-500">Achievements</div>
                </>
              )}
            </div>
          </div>
          {isCreator && (
            <Link
              href={isOwnProfile ? "/achievements" : `#achievements`}
              className="mt-3 block rounded-xl bg-white/[0.03] border border-white/5 px-4 py-2 text-center hover:border-[#53fc18]/20 transition-colors"
            >
              <Trophy className="inline h-3.5 w-3.5 text-[#53fc18] mr-1" />
              <span className="text-xs text-zinc-500">
                {dj.achievements.length} achievements unlocked
                {isOwnProfile ? " · view all →" : ""}
              </span>
            </Link>
          )}
        </div>
      </div>

      {isCreator && (
        <DjProfileTabs
          username={dj.username}
          activeTab={tab}
          isLive={Boolean(liveStream)}
        />
      )}

      {tab === "archive" && isCreator ? (
        <section>
          <h2 className="text-lg font-bold mb-4">Set archive</h2>
          <p className="text-sm text-zinc-500 mb-4">
            {archiveStreams.length} replay{archiveStreams.length === 1 ? "" : "s"}
            {liveStream ? " · go live to add more" : ""}
          </p>
          <DjArchiveList
            streams={archiveStreams}
            liveStreamId={liveStream?.id}
            canDelete={isOwnProfile && isCreator}
            canPin={isOwnProfile && isCreator}
            featuredStreamId={dj.featuredStreamId}
          />
        </section>
      ) : (
        <>
          {featuredStream && tab === "overview" && (
            <section className="mt-8">
              <FeaturedReplayCard stream={featuredStream} />
            </section>
          )}

          <section id="achievements" className="mt-8 scroll-mt-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Achievements</h2>
              {isOwnProfile && (
                <Link href="/achievements" className="text-xs text-[#53fc18] hover:underline">
                  View all →
                </Link>
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              {dj.achievements.map((ua) => (
                <div key={ua.id} className="flex flex-col items-center gap-1">
                  <span className="text-3xl">{ua.achievement.icon}</span>
                  <span className="text-xs text-zinc-500 text-center max-w-[80px]">{ua.achievement.name}</span>
                </div>
              ))}
              {dj.achievements.length === 0 && (
                <p className="text-sm text-zinc-500">
                  {isOwnProfile ? "No achievements yet — stream and engage to unlock badges." : "No achievements unlocked yet."}
                </p>
              )}
            </div>
          </section>

          {isCreator && (
            <StakePanel djUsername={dj.username} ownerView={isOwnProfile} />
          )}

          {dj.role === "fan" && fanFollowing.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold mb-4">Following</h2>
              <div className="flex flex-wrap gap-2">
                {fanFollowing.map((f) => (
                  <Link
                    key={f.id}
                    href={`/dj/${f.following.username}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#141416] px-3 py-2 text-sm hover:border-[#53fc18]/30"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-xs font-bold">
                      {f.following.avatar}
                    </span>
                    {f.following.displayName}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {dj.role === "fan" && fanMemberships.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold mb-4">Memberships</h2>
              <div className="space-y-2">
                {fanMemberships.map((m) => (
                  <Link
                    key={m.id}
                    href={`/dj/${m.dj.username}#membership`}
                    className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3 text-sm hover:border-purple-500/40"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-xs font-bold">
                        {m.dj.avatar}
                      </span>
                      {m.dj.displayName}
                    </span>
                    <span className="text-xs text-zinc-500 capitalize">
                      {m.tier} · {Math.round(m.monthlyAmount)} {DROP_TOKEN_SYMBOL}/mo
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {dj.role === "fan" && isOwnProfile && (
            <section className="mt-8">
              <Link
                href="/achievements"
                className="block rounded-xl border border-white/10 bg-[#141416] px-4 py-4 text-center hover:border-[#53fc18]/30 transition-colors"
              >
                <Trophy className="inline h-5 w-5 text-[#53fc18] mr-2" />
                <span className="text-sm font-medium">View your achievements</span>
              </Link>
            </section>
          )}

          {isCreator && archiveStreams.length > 0 && (
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
