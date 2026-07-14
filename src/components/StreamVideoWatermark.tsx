"use client";

import { LogoMarkOnly } from "@/components/Logo";

const SITE_HOST =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/^www\./, "") || "livebooth.uk";

export function StreamVideoWatermark() {
  return (
    <div
      className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-black/40 border border-white/10 px-2 py-1 pointer-events-none select-none"
      aria-hidden
    >
      <LogoMarkOnly className="h-4 w-4 rounded border-white/5" />
      <span className="text-[10px] font-semibold tracking-wide text-white/80">{SITE_HOST}</span>
    </div>
  );
}
