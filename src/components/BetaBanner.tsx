"use client";

import { Sparkles } from "lucide-react";

export function BetaBanner() {
  if (process.env.NEXT_PUBLIC_BETA_MODE !== "true") return null;
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return null;

  return (
    <div className="mx-3 sm:mx-4 lg:mx-6 mt-3 rounded-xl border border-[#53fc18]/25 bg-[#53fc18]/5 px-4 py-2.5">
      <p className="flex items-center gap-2 text-sm text-zinc-300">
        <Sparkles className="h-4 w-4 text-[#53fc18] shrink-0" />
        <span>
          <span className="font-semibold text-[#53fc18]">Beta</span>
          {" — "}
          LiveBooth is in early access. Report issues via{" "}
          <a href="/support" className="text-[#53fc18] hover:underline">
            Support
          </a>
          .
        </span>
      </p>
    </div>
  );
}
