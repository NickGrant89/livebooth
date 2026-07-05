import Link from "next/link";
import { Radio, TrendingUp, Coins, Trophy, Zap, ChevronRight, Mic2, Sparkles, Heart, Building2 } from "lucide-react";
import { StreamCard } from "@/components/StreamCard";
import { GenreFilter } from "@/components/GenreFilter";
import { LogoMarkOnly } from "@/components/Logo";
import { GenreNightBanner } from "@/components/GenreNightBanner";
import { GettingStartedPanel } from "@/components/GettingStartedPanel";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { genreLabels, DROP_TOKEN_SYMBOL, APP_TAGLINE, DAY_LABELS } from "@/lib/constants";
import { fetchDiscoverLiveStreams } from "@/lib/discover-home";
import { fetchForYouLiveStreams } from "@/lib/discover-for-you";
import { fetchPublicStations, fetchUpcomingStationShows, formatSlotLabel } from "@/lib/stations-discover";
import { getHeroLabel, isGridPromoted } from "@/lib/discover-ranking";
import { QuestPanel } from "@/components/QuestPanel";
import { HomeDiscoverRefresh } from "@/components/HomeDiscoverRefresh";
import { StationBrandAvatar } from "@/components/StationBrandAvatar";

export const dynamic = "force-dynamic";

async function getHomeData(genre?: string, userId?: string) {
  const [liveStreamsRaw, djs, totalTips, achievementCount, forYouStreams, upcomingStationShows, radioStations] =
    await Promise.all([
    fetchDiscoverLiveStreams(genre),
    prisma.user.findMany({
      where: { role: "dj" },
      include: {
        balance: true,
        streams: { where: { status: "live" }, take: 1 },
        _count: { select: { followers: true } },
      },
    }),
    prisma.tip.aggregate({ _sum: { amount: true } }),
    prisma.achievement.count(),
    userId ? fetchForYouLiveStreams(userId) : Promise.resolve([]),
    fetchUpcomingStationShows(6),
    fetchPublicStations(4),
  ]);

  const liveStreams = liveStreamsRaw.map((s) => ({
    ...s,
    startedAt: s.startedAt ? new Date(s.startedAt) : null,
    promotedUntil: s.promotedUntil ? new Date(s.promotedUntil) : null,
  }));

  const scheduledDjs = djs.filter(
    (d) =>
      d.weeklySlotDay != null &&
      d.weeklySlotHour != null &&
      d.streams.length === 0,
  );

  return {
    liveStreams,
    djs,
    totalTips: totalTips._sum.amount ?? 0,
    achievementCount,
    scheduledDjs,
    forYouStreams,
    upcomingStationShows,
    radioStations,
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const { genre } = await searchParams;
  const session = await getSessionUser();
  const { liveStreams, djs, totalTips, achievementCount, scheduledDjs, forYouStreams, upcomingStationShows, radioStations } =
    await getHomeData(genre, session?.id);
  const featured = liveStreams[0];
  const rest = liveStreams.slice(1);
  const heroLabel = featured ? getHeroLabel(featured) : "Trending";

  return (
    <div className="mx-auto max-w-[1600px] w-full min-w-0 overflow-x-hidden">
      <HomeDiscoverRefresh />
      <GenreNightBanner />
      <GettingStartedPanel />
      <QuestPanel />
      {featured ? (
        <section className="relative mx-4 lg:mx-6 mt-4 rounded-2xl overflow-hidden aspect-[21/9] min-h-[280px] max-h-[480px] glass-hover transition-all">
          <Link href={`/stream/${featured.dj.username}`} className="absolute inset-0 block">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#12121a] to-[#0a0a0f]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(83,252,24,0.12),transparent_60%)]" />

            <div className="absolute top-5 left-5 flex items-center gap-2">
              <span className="live-pulse flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <Radio className="h-3 w-3" />
                Live
              </span>
              <span className="rounded-lg bg-black/50 backdrop-blur px-3 py-1 text-xs font-mono text-zinc-300">
                {featured.viewers.toLocaleString()} session peak
              </span>
              {heroLabel === "Sponsored" ? (
                <span className="rounded-lg bg-amber-500/20 backdrop-blur px-3 py-1 text-xs font-bold uppercase text-amber-300">
                  Sponsored
                </span>
              ) : null}
              {featured.sessionTips > 0 ? (
                <span className="rounded-lg bg-[#53fc18]/15 backdrop-blur px-3 py-1 text-xs font-semibold text-[#53fc18]">
                  {featured.sessionTips.toLocaleString()} {DROP_TOKEN_SYMBOL} tipped
                </span>
              ) : null}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10">
              <p className="text-[#53fc18] text-sm font-semibold uppercase tracking-widest mb-2">
                {genreLabels[featured.genre]} · {heroLabel}
              </p>
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold tracking-tight max-w-3xl leading-tight break-words">
                {featured.title}
              </h1>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#53fc18] to-[#15CFF4] text-lg font-bold text-black">
                  {featured.dj.avatar}
                </div>
                <div>
                  <p className="font-semibold text-lg">{featured.dj.displayName}</p>
                  <p className="text-zinc-400 text-sm">@{featured.dj.username}</p>
                </div>
                <span className="ml-auto hidden sm:flex items-center gap-2 btn-primary rounded-xl px-5 py-2.5 text-sm">
                  Watch Now <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        </section>
      ) : (
        <section className="relative mx-4 lg:mx-6 mt-4 rounded-2xl overflow-hidden min-h-[320px] lg:min-h-[380px] border border-white/[0.08]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#041018] via-[#0a0a12] to-[#030304]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(21,207,244,0.15),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_30%,rgba(83,252,24,0.12),transparent_50%)]" />
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:48px_48px]" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10 p-8 lg:p-14 h-full min-h-[320px]">
            <div className="max-w-xl text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#15CFF4]/30 bg-[#15CFF4]/10 px-3 py-1 text-xs font-semibold text-[#15CFF4] mb-5">
                <Sparkles className="h-3 w-3" />
                {DROP_TOKEN_SYMBOL} on VeChain
              </div>
              <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                Live from the booth.
                <span className="block text-gradient mt-1">{APP_TAGLINE}.</span>
              </h1>
              <p className="text-zinc-400 mt-4 text-base lg:text-lg max-w-md mx-auto lg:mx-0">
                Stream DJ sets, earn {DROP_TOKEN_SYMBOL}, unlock track IDs, and tip your favorite artists in real time.
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-8">
                <Link href="/go-live" className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm">
                  <Mic2 className="h-4 w-4" />
                  Go Live
                </Link>
                <Link
                  href="/leaderboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  Explore DJs
                </Link>
              </div>
            </div>
            <div className="hidden lg:flex flex-col items-center gap-4">
              <LogoMarkOnly className="h-28 w-28 rounded-2xl shadow-2xl shadow-[#15CFF4]/20" />
              <p className="text-xs text-zinc-600 font-mono tracking-widest uppercase">livebooth.fm</p>
            </div>
          </div>
        </section>
      )}

      <section className="mx-3 sm:mx-4 lg:mx-6 mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 min-w-0">
        {[
          { icon: Radio, label: "Live Now", value: liveStreams.length, color: "text-red-400" },
          { icon: Coins, label: "DROP Tipped", value: Math.round(totalTips).toLocaleString(), color: "text-[#53fc18]" },
          { icon: Trophy, label: "Achievements", value: achievementCount, color: "text-yellow-400" },
          { icon: Zap, label: "Creator Split", value: "90/10", color: "text-[#15CFF4]" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={`p-1.5 sm:p-2 rounded-lg bg-white/5 ${color} shrink-0`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-xl font-bold truncate">{value}</p>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 uppercase tracking-wider truncate">{label}</p>
            </div>
          </div>
        ))}
      </section>

      {(upcomingStationShows.length > 0 || scheduledDjs.length > 0) && liveStreams.length === 0 && (
        <section className="mx-4 lg:mx-6 mt-4 rounded-xl border border-white/5 bg-[#141416] p-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Starting soon</p>
          <div className="flex flex-wrap gap-3">
            {upcomingStationShows.map((show) => (
              <Link
                key={`${show.stationSlug}-${show.djUsername}-${show.slotDay}`}
                href={`/station/${show.stationSlug}`}
                className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                <StationBrandAvatar
                  name={show.stationName}
                  avatar={show.stationAvatar}
                  avatarUrl={show.stationAvatarUrl}
                  size="xs"
                />
                <span>
                  {show.showTitle}{" "}
                  <span className="text-zinc-500">@{show.djUsername}</span>
                </span>
                <span className="text-xs text-zinc-500">
                  {formatSlotLabel(show.slotDay, show.slotHour, show.slotLabel)}
                </span>
              </Link>
            ))}
            {scheduledDjs.slice(0, 3).map((dj) => (
              <Link
                key={dj.id}
                href={`/dj/${dj.username}`}
                className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                <span className="font-bold">{dj.avatar}</span>
                <span>{dj.displayName}</span>
                {dj.weeklySlotDay != null && dj.weeklySlotHour != null && (
                  <span className="text-xs text-zinc-500">
                    {DAY_LABELS[dj.weeklySlotDay]} {dj.weeklySlotHour}:00 UTC
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {radioStations.length > 0 && (
        <section className="mx-4 lg:mx-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#53fc18]" />
              Radio stations
            </h2>
            <Link href="/residencies" className="text-sm text-zinc-500 hover:text-[#53fc18]">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {radioStations.map((s) => (
              <Link
                key={s.id}
                href={s.isLive && s.liveDjUsername ? `/stream/${s.liveDjUsername}` : `/station/${s.slug}`}
                className="glass rounded-xl p-4 hover:border-[#53fc18]/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <StationBrandAvatar
                    name={s.name}
                    avatar={s.avatar}
                    avatarUrl={s.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{s.name}</p>
                    <p className="text-xs text-zinc-500">
                      {s.isLive ? (
                        <span className="text-red-400">● Live now</span>
                      ) : (
                        <>{s.followerCount} followers</>
                      )}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-3 sm:mx-4 lg:mx-6 mt-8 min-w-0 overflow-hidden">
        <GenreFilter active={genre} />
      </section>

      {forYouStreams.length > 0 && (
        <section className="mx-4 lg:mx-6 mt-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Heart className="h-5 w-5 text-[#53fc18]" />
              For you
            </h2>
            <span className="text-sm text-zinc-500">DJs you follow</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {forYouStreams.map((s) => (
              <StreamCard key={s.id} stream={s} />
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 ? (
      <section className="mx-4 lg:mx-6 mt-8 mb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 live-pulse" />
            Live Channels
          </h2>
          <span className="text-sm text-zinc-500">{liveStreams.length} streaming</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rest.map((s) => (
            <StreamCard key={s.id} stream={s} sponsored={isGridPromoted(s)} />
          ))}
        </div>
      </section>
      ) : liveStreams.length === 0 ? (
      <section className="mx-4 lg:mx-6 mt-8 mb-12">
        <div className="glass rounded-2xl py-16 text-center">
          <p className="text-zinc-400">No one is live{genre ? ` in ${genreLabels[genre]}` : ""} right now.</p>
          <Link href="/go-live" className="inline-flex mt-4 btn-primary rounded-xl px-5 py-2.5 text-sm">
            Be the first to go live
          </Link>
        </div>
      </section>
      ) : null}

      <section className="mx-4 lg:mx-6 mb-16">
        <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#53fc18]" />
          Top Earners
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...djs]
            .sort((a, b) => (b.balance?.totalEarned ?? 0) - (a.balance?.totalEarned ?? 0))
            .slice(0, 6)
            .map((dj, i) => (
              <Link
                key={dj.id}
                href={`/dj/${dj.username}`}
                className="glass glass-hover rounded-xl p-4 flex items-center gap-4 transition-all"
              >
                <span className="text-2xl font-bold text-zinc-700 w-8">#{i + 1}</span>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#53fc18] to-[#15CFF4] text-sm font-bold text-black">
                  {dj.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{dj.displayName}</p>
                  <p className="text-xs text-zinc-500">{dj._count.followers} fans</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#53fc18] font-mono text-sm">
                    {Math.round(dj.balance?.totalEarned ?? 0)}
                  </p>
                  <p className="text-[10px] text-zinc-600">{DROP_TOKEN_SYMBOL}</p>
                </div>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
