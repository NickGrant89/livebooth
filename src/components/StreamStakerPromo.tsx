"use client";

import Link from "next/link";
import { Check, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { STAKER_PERKS, DJ_STAKER_PERKS, DJ_STAKER_VOD_EARLY_HOURS } from "@/lib/constants";

type StreamStakerPromoProps = {
  djUsername: string;
  djDisplayName: string;
  stationSlug?: string | null;
  stationName?: string | null;
  isHost: boolean;
};

export function StreamStakerPromo({
  djUsername,
  djDisplayName,
  stationSlug,
  stationName,
  isHost,
}: StreamStakerPromoProps) {
  const { user } = useAuth();

  if (isHost) return null;

  const isStation = Boolean(stationSlug);
  const perks = isStation ? STAKER_PERKS : DJ_STAKER_PERKS;
  const href = isStation ? `/station/${stationSlug}#stake` : `/dj/${djUsername}#stake`;
  const title = isStation
    ? `Become a ${stationName ?? "station"} member`
    : `Back ${djDisplayName}`;
  const cta = isStation ? "Become a member" : "Back this DJ";

  return (
    <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-cyan-200 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 shrink-0" />
            {title}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {isStation
              ? "Lock 50+ DROP for badge, cheaper unlocks, early replays, and milestone rewards."
              : `Lock 50+ DROP for early replay (${DJ_STAKER_VOD_EARLY_HOURS}h), discounts, and milestone rewards.`}
          </p>
          <ul className="mt-2 grid sm:grid-cols-2 gap-1">
            {perks.slice(0, 4).map((perk) => (
              <li key={perk} className="flex items-start gap-1 text-[10px] text-zinc-500">
                <Check className="h-3 w-3 shrink-0 text-[#53fc18] mt-0.5" />
                {perk.replace("12h", `${DJ_STAKER_VOD_EARLY_HOURS}h`)}
              </li>
            ))}
          </ul>
        </div>
        <Link
          href={user ? href : "/login"}
          className="shrink-0 inline-flex items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-4 py-2 text-sm font-bold text-cyan-200 hover:bg-cyan-500/30 transition-colors"
        >
          {user ? cta : "Sign in to stake"}
        </Link>
      </div>
    </div>
  );
}
