import type { Metadata } from "next";
import Link from "next/link";
import {
  Radio,
  Users,
  Coins,
  Music,
  ExternalLink,
  Calendar,
  Star,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { notFound } from "next/navigation";
import { StationFollowButton } from "@/components/StationFollowButton";
import { StationStakePanel } from "@/components/StationStakePanel";
import { StationFanCta } from "@/components/StationFanCta";
import { ShareMenu } from "@/components/ShareMenu";
import {
  getStationBySlug,
  getLiveStreamForStation,
  getStationStats,
  getTierMeta,
  getNextScheduledResident,
  getLiveResidentUsernames,
} from "@/lib/stations";
import { DAY_LABELS, DROP_TOKEN_SYMBOL, RADIO_TIERS, genreLabels } from "@/lib/constants";
import { stationMetadata } from "@/lib/metadata-share";

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
  return stationMetadata({
    slug: station.slug,
    name: station.name,
    tagline: station.tagline,
    followerCount: station._count.follows,
    isLive: Boolean(live),
  });
}

export default async function StationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const station = await getStationBySlug(slug);
  if (!station) notFound();

  const liveStream = await getLiveStreamForStation(station.id);
  const tierMeta = getTierMeta(station.tier);
  const stats = tierMeta.stationDashboard ? await getStationStats(station.id) : null;
  const nextShow = !liveStream ? getNextScheduledResident(station.residents) : null;
  const liveResidents = await getLiveResidentUsernames(
    station.id,
    station.residents.map((r) => r.djId),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Hero header */}
      <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a1628] via-[#0a0a0c] to-[#141416] p-5 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(83,252,24,0.08),_transparent_60%)] pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row gap-5 items-start">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#53fc18] to-[#00f0ff] text-2xl font-bold text-black shrink-0 shadow-lg shadow-[#53fc18]/10">
            {station.avatar || station.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{station.name}</h1>
              <span className="rounded-full bg-[#53fc18]/10 border border-[#53fc18]/30 px-2.5 py-0.5 text-[11px] font-bold uppercase text-[#53fc18]">
                {tierMeta.label} radio
              </span>
              {liveStream && (
                <span className="rounded-full bg-red-500/20 border border-red-500/40 px-2.5 py-0.5 text-[11px] font-bold uppercase text-red-300 flex items-center gap-1">
                  <Radio className="h-3 w-3 animate-pulse" /> On air
                </span>
              )}
            </div>
            {station.tagline && (
              <p className="text-zinc-400 mt-1.5 text-sm sm:text-base">{station.tagline}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {station._count.follows.toLocaleString()} followers
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                {station._count.stakes.toLocaleString()} stakers
              </span>
              {station.flagshipDj && (
                <span className="flex items-center gap-1 text-amber-400/90">
                  <Star className="h-3.5 w-3.5" />
                  Flagship: {station.flagshipDj.displayName}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <StationFollowButton slug={station.slug} />
              <ShareMenu
                kind="station"
                path={`/station/${station.slug}`}
                stationName={station.name}
                username={station.slug}
                label="Share station"
                variant="secondary"
              />
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10"
              >
                <Trophy className="h-3.5 w-3.5" />
                Rankings
              </Link>
            </div>
          </div>
        </div>
      </header>

      <StationFanCta
        slug={station.slug}
        isLive={Boolean(liveStream)}
        liveStreamTitle={liveStream?.title}
      />

      {/* Live / off-air */}
      {liveStream ? (
        <section className="rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-transparent p-5">
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase mb-3">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            {liveStream.stationChannel ? "Station channel live" : "On air now"}
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-lg font-bold text-white">{liveStream.title}</p>
              <p className="text-sm text-zinc-400 mt-0.5">
                {liveStream.stationChannel ? (
                  <span>{station.name} studio feed</span>
                ) : (
                  <Link href={`/dj/${liveStream.dj.username}`} className="hover:text-[#53fc18]">
                    {liveStream.dj.displayName}
                  </Link>
                )}
                {liveStream.nowPlaying && (
                  <span className="text-zinc-500">
                    {" "}
                    · {liveStream.nowPlaying.artist} — {liveStream.nowPlaying.title}
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-zinc-500">
                <span>{liveStream.peakViewers} peak viewers</span>
                <span className="text-[#53fc18]">{liveStream.totalTips} {DROP_TOKEN_SYMBOL} tipped</span>
                {liveStream.genre && (
                  <span>{genreLabels[liveStream.genre as keyof typeof genreLabels] ?? liveStream.genre}</span>
                )}
              </div>
            </div>
            <Link
              href={`/station/${station.slug}/live`}
              className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold shrink-0 w-full sm:w-auto text-center"
            >
              {liveStream.stationChannel ? "Watch station channel" : "Join booth"}
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <Radio className="h-8 w-8 text-zinc-600 mx-auto sm:mx-0 mb-2" />
              <p className="text-zinc-400 text-sm">No resident DJ is live right now.</p>
              {nextShow && (
                <p className="text-xs text-zinc-500 mt-2 flex items-center justify-center sm:justify-start gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Next: <span className="text-zinc-300">{nextShow.showTitle || nextShow.dj.displayName}</span>
                  {nextShow.slotDay != null && nextShow.slotHour != null && (
                    <span>
                      · {DAY_LABELS[nextShow.slotDay]} {String(nextShow.slotHour).padStart(2, "0")}:00 UTC
                    </span>
                  )}
                </p>
              )}
            </div>
            {station.relayUrl && tierMeta.relayMode && (
              <a
                href={station.relayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#53fc18]/30 bg-[#53fc18]/10 px-4 py-2.5 text-sm font-semibold text-[#53fc18] hover:bg-[#53fc18]/15 shrink-0"
              >
                Listen to relay <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </section>
      )}

      {stats && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Followers", value: station._count.follows.toLocaleString(), icon: Users },
            { label: "Peak listeners", value: stats.totalListeners.toLocaleString(), icon: Radio },
            { label: "DROP on shows", value: stats.dropEarned.toLocaleString(), icon: Coins },
            { label: "Tracks unlocked", value: stats.tracksUnlocked.toLocaleString(), icon: Music },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-[#141416] p-4 hover:border-[#53fc18]/20 transition-colors">
              <Icon className="h-4 w-4 text-zinc-500 mb-2" />
              <p className="text-xl font-bold text-white font-mono">{value}</p>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wide mt-1">{label}</p>
            </div>
          ))}
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Residency lineup</h2>
          {tierMeta.relayMode && (
            <Link
              href={`/embed/station/${station.slug}`}
              className="text-xs text-zinc-500 hover:text-[#53fc18]"
            >
              Embed player →
            </Link>
          )}
        </div>
        {station.residents.length === 0 ? (
          <p className="text-sm text-zinc-500 rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center">
            No resident DJs booked yet.
          </p>
        ) : (
          <div className="space-y-2">
            {station.residents.map((r) => {
              const isLive = liveResidents.has(r.dj.username);
              const isFlagship = station.flagshipDjId === r.djId;
              return (
                <Link
                  key={r.id}
                  href={isLive ? `/stream/${r.dj.username}` : `/dj/${r.dj.username}`}
                  className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
                    isLive
                      ? "border-red-500/30 bg-red-500/5 hover:border-red-500/50"
                      : "border-white/10 bg-white/[0.02] hover:border-[#53fc18]/30"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#53fc18]/80 to-[#00f0ff]/80 text-xs font-bold text-black">
                      {r.dj.avatar}
                    </div>
                    {isLive && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-[#0a0a0c] animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white truncate">
                        {r.showTitle || r.dj.displayName}
                      </p>
                      {isLive && (
                        <span className="text-[10px] font-bold uppercase text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded">
                          Live
                        </span>
                      )}
                      {isFlagship && (
                        <span className="text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5" /> Flagship
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">{r.dj.displayName}</p>
                  </div>
                  {r.slotDay != null && r.slotHour != null && (
                    <span className="text-xs text-zinc-400 shrink-0 text-right">
                      {DAY_LABELS[r.slotDay]} {String(r.slotHour).padStart(2, "0")}:00 UTC
                      {r.slotLabel ? (
                        <span className="block text-zinc-600">{r.slotLabel}</span>
                      ) : null}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <StationStakePanel slug={station.slug} />

      <section className="rounded-xl border border-white/10 bg-[#141416] p-5">
        <h2 className="text-sm font-bold text-white mb-2">Radio program tier</h2>
        <p className="text-sm text-zinc-400 mb-4">{tierMeta.description}</p>
        <ul className="text-xs text-zinc-500 space-y-1.5">
          <li>Tip split: 70% resident DJ / 20% station / 10% platform ({DROP_TOKEN_SYMBOL})</li>
          <li>Up to {tierMeta.maxResidents} resident shows</li>
          {tierMeta.relayMode && <li>Relay mode — keep your Icecast / Radio.co encoder</li>}
          {tierMeta.stationDashboard && <li>Station dashboard with listener &amp; DROP stats</li>}
          {tierMeta.whiteLabel && <li>White-label player embed for your site</li>}
        </ul>
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.values(RADIO_TIERS).map((t) => (
            <span
              key={t.id}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase border ${
                t.id === station.tier
                  ? "border-[#53fc18]/40 bg-[#53fc18]/10 text-[#53fc18]"
                  : "border-white/10 text-zinc-600"
              }`}
            >
              {t.label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
