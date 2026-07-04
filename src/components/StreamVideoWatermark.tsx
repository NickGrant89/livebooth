"use client";

import { LogoMarkOnly } from "@/components/Logo";

const SITE_HOST =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/^www\./, "") || "livebooth.uk";

export function StreamVideoWatermark() {
  return (
    <div
      className="absolute left-3 bottom-11 z-[15] flex items-center gap-1.5 rounded-md bg-black/50 border border-white/10 px-2 py-1 backdrop-blur-sm pointer-events-none select-none"
      aria-hidden
    >
      <LogoMarkOnly className="h-5 w-5 rounded-md border-white/5" />
      <span className="text-[10px] font-semibold tracking-wide text-white/90">{SITE_HOST}</span>
    </div>
  );
}
