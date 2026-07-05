import Link from "next/link";
import { Building2, Radio, Users, ChevronRight } from "lucide-react";
import { StationBrandAvatar } from "@/components/StationBrandAvatar";
import { fetchPublicStations, formatSlotLabel } from "@/lib/stations-discover";

export const dynamic = "force-dynamic";

export default async function ResidenciesPage() {
  const stations = await fetchPublicStations(48);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-16">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8 text-[#53fc18]" />
          <h1 className="text-3xl font-bold text-white">Radio stations</h1>
        </div>
        <p className="text-zinc-400 max-w-2xl">
          Branded channels with resident DJ lineups. Follow a station for go-live alerts and catch
          the next show.
        </p>
        <Link
          href="/signup"
          className="inline-flex mt-4 rounded-xl border border-[#53fc18]/40 bg-[#53fc18]/10 px-4 py-2 text-sm font-semibold text-[#53fc18] hover:bg-[#53fc18]/20"
        >
          Launch your station →
        </Link>
      </div>

      {stations.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141416] p-12 text-center text-zinc-500">
          <p>No stations yet.</p>
          <Link href="/help/stations" className="text-[#53fc18] hover:underline text-sm mt-2 inline-block">
            How to set one up
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {stations.map((s) => (
            <Link
              key={s.id}
              href={s.isLive && s.liveDjUsername ? `/stream/${s.liveDjUsername}` : `/station/${s.slug}`}
              className="group rounded-2xl border border-white/10 bg-[#141416] p-5 hover:border-[#53fc18]/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <StationBrandAvatar
                  name={s.name}
                  avatar={s.avatar}
                  avatarUrl={s.avatarUrl}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-white group-hover:text-[#53fc18] transition-colors truncate">
                      {s.name}
                    </h2>
                    {s.isLive && (
                      <span className="rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[10px] font-bold uppercase text-red-300 flex items-center gap-1">
                        <Radio className="h-3 w-3" /> Live
                      </span>
                    )}
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase text-zinc-500">
                      {s.tierLabel}
                    </span>
                  </div>
                  {s.tagline && <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{s.tagline}</p>}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-zinc-600">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {s.followerCount} followers
                    </span>
                    <span>{s.residentCount} residents</span>
                  </div>
                  {s.isLive && s.liveTitle && (
                    <p className="text-xs text-[#53fc18] mt-2 truncate">Now: {s.liveTitle}</p>
                  )}
                  {!s.isLive && s.nextShow && (
                    <p className="text-xs text-zinc-500 mt-2">
                      Next: {s.nextShow.showTitle} ·{" "}
                      {formatSlotLabel(s.nextShow.slotDay, s.nextShow.slotHour, s.nextShow.slotLabel)}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-[#53fc18] shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
