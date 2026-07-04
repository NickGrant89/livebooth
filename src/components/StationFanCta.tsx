"use client";

import Link from "next/link";
import { Heart, Play, Coins } from "lucide-react";
import { StationFollowButton } from "@/components/StationFollowButton";

type StationFanCtaProps = {
  slug: string;
  isLive?: boolean;
  liveStreamTitle?: string | null;
};

export function StationFanCta({ slug, isLive = false, liveStreamTitle }: StationFanCtaProps) {
  const liveHref = `/station/${slug}/live`;

  return (
    <section className="rounded-xl border border-[#53fc18]/20 bg-gradient-to-r from-[#53fc18]/5 to-transparent p-5">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[#53fc18] mb-3">
        Join the booth
      </h2>
      <ol className="grid sm:grid-cols-3 gap-3">
        <li className="rounded-lg border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
            <Heart className="h-4 w-4 text-[#53fc18]" />
            1. Follow
          </div>
          <p className="text-xs text-zinc-500 mb-3">Get alerts when the station or residents go live.</p>
          <StationFollowButton slug={slug} />
        </li>
        <li className="rounded-lg border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
            <Play className="h-4 w-4 text-[#53fc18]" />
            2. Watch
          </div>
          <p className="text-xs text-zinc-500 mb-3">
            {isLive ? liveStreamTitle ?? "A show is live now." : "Tune in when the station goes live."}
          </p>
          {isLive ? (
            <Link
              href={liveHref}
              className="inline-flex rounded-lg bg-[#53fc18] px-4 py-2 text-xs font-bold text-black"
            >
              Join live booth
            </Link>
          ) : (
            <span className="text-xs text-zinc-600">Off air — check back soon</span>
          )}
        </li>
        <li className="rounded-lg border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
            <Coins className="h-4 w-4 text-[#53fc18]" />
            3. Tip
          </div>
          <p className="text-xs text-zinc-500 mb-3">
            Tips pay the show and station during live broadcasts.
          </p>
          {isLive ? (
            <Link
              href={liveHref}
              className="inline-flex rounded-lg border border-[#53fc18]/40 bg-[#53fc18]/10 px-4 py-2 text-xs font-semibold text-[#53fc18]"
            >
              Tip the drop
            </Link>
          ) : (
            <span className="text-xs text-zinc-600">Available during live sets</span>
          )}
        </li>
      </ol>
    </section>
  );
}
