"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";

export function BetaBanner() {
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_BETA_MODE !== "true") {
      setVisible(false);
      return;
    }
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      setVisible(false);
      return;
    }
    apiFetch("/api/platform/status")
      .then((r) => r.json())
      .then((d) => setVisible(d.betaBannerEnabled !== false))
      .catch(() => setVisible(true));
  }, []);

  if (visible !== true) return null;

  return (
    <div className="mx-3 sm:mx-4 lg:mx-6 mt-3 rounded-xl border border-[#53fc18]/25 bg-[#53fc18]/5 px-4 py-2.5">
      <p className="flex items-center gap-2 text-sm text-zinc-300">
        <Sparkles className="h-4 w-4 text-[#53fc18] shrink-0" />
        <span>
          <span className="font-semibold text-[#53fc18]">Beta</span>
          {" — "}
          LiveBooth is in early access. Use{" "}
          <a href="/support" className="text-[#53fc18] hover:underline">
            live support chat
          </a>
          .
        </span>
      </p>
    </div>
  );
}
