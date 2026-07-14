"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { MEMBER_TIER_PRICES, DROP_TOKEN_SYMBOL } from "@/lib/constants";

type StreamMemberPromoProps = {
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
}: StreamMemberPromoProps) {
  const { user } = useAuth();

  if (isHost) return null;

  const isStation = Boolean(stationSlug);
  const href = isStation
    ? `/station/${stationSlug}#membership`
    : `/dj/${djUsername}#membership`;
  const title = isStation
    ? `Support ${stationName ?? "this station"}`
    : `Back ${djDisplayName}`;
  const cta = isStation ? "Become a station member" : "Join membership";

  return (
    <div className="mt-3 rounded-xl border border-[#53fc18]/25 bg-gradient-to-r from-[#53fc18]/10 to-cyan-500/5 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-[#53fc18] flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0" />
            {title}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {isStation
              ? `From ${MEMBER_TIER_PRICES.member} ${DROP_TOKEN_SYMBOL}/mo — 75% supports the station, perks on every resident show.`
              : `From ${MEMBER_TIER_PRICES.member} ${DROP_TOKEN_SYMBOL}/mo — 85% goes to the DJ, early replays & chat badge.`}
          </p>
        </div>
        <Link
          href={user ? href : "/login"}
          className="shrink-0 inline-flex items-center justify-center rounded-lg bg-[#53fc18] px-4 py-2 text-sm font-bold text-black hover:opacity-90 transition-opacity"
        >
          {user ? cta : "Sign in to join"}
        </Link>
      </div>
    </div>
  );
}
