"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, Sparkles, Zap } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";
import { RADIO_TIERS } from "@/lib/constants";

const BETA_MODE = process.env.NEXT_PUBLIC_BETA_MODE === "true";

const TIER_FEATURES: Record<string, string[]> = {
  community: [
    "5 resident DJs",
    "Station dashboard & stats",
    "Public channel page",
    "Staking milestones",
  ],
  pro: [
    "15 resident DJs",
    "Relay mode (Icecast / Radio.co HLS)",
    "Embed player for your website",
    "Live video when residents go live",
    "Everything in Community",
  ],
  network: [
    "50 resident DJs",
    "Hide LiveBooth branding on embed",
    "Multi-show network tools",
    "Everything in Pro",
  ],
};

type Props = {
  currentTier: string;
  onUpgraded: () => void;
};

export function StationTierUpgrade({ currentTier, onUpgraded }: Props) {
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (currentTier !== "community") return null;

  async function enableProBeta() {
    setUpgrading(true);
    setError("");
    setMessage("");
    const res = await apiFetch("/api/stations/owner/upgrade", { method: "POST" });
    const body = await res.json();
    setUpgrading(false);
    if (!res.ok) {
      setError(body.error ?? "Upgrade failed");
      return;
    }
    setMessage(body.alreadyUpgraded ? "Already on Pro — refresh below." : "Pro enabled — complete setup below.");
    onUpgraded();
  }

  return (
    <section className="rounded-xl border border-[#15CFF4]/30 bg-gradient-to-br from-[#15CFF4]/5 to-transparent p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#15CFF4]/10 border border-[#15CFF4]/30">
          <Sparkles className="h-5 w-5 text-[#15CFF4]" />
        </div>
        <div>
          <h3 className="font-bold text-white">Upgrade to Pro</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Unlock relay mode, website embed, and room for 15 resident DJs — plus live video when your
            residents stream from OBS.
          </p>
        </div>
      </div>

      {message && (
        <p className="text-sm text-[#53fc18] border border-[#53fc18]/30 rounded-lg px-3 py-2">{message}</p>
      )}
      {error && (
        <p className="text-sm text-red-400 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        {(["community", "pro", "network"] as const).map((id) => {
          const tier = RADIO_TIERS[id];
          const isCurrent = id === currentTier;
          const isPro = id === "pro";
          return (
            <div
              key={id}
              className={`rounded-lg border p-4 space-y-3 ${
                isPro
                  ? "border-[#15CFF4]/40 bg-[#15CFF4]/5"
                  : isCurrent
                    ? "border-[#53fc18]/30 bg-[#53fc18]/5"
                    : "border-white/10 bg-black/20"
              }`}
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{tier.label}</p>
                {isCurrent && (
                  <span className="text-[10px] text-[#53fc18] font-semibold">Current plan</span>
                )}
                {isPro && !isCurrent && (
                  <span className="text-[10px] text-[#15CFF4] font-semibold">Recommended</span>
                )}
              </div>
              <ul className="space-y-1.5">
                {(TIER_FEATURES[id] ?? []).map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[11px] text-zinc-400">
                    <Check className="h-3 w-3 shrink-0 text-[#53fc18] mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {BETA_MODE ? (
          <button
            type="button"
            onClick={enableProBeta}
            disabled={upgrading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#15CFF4] to-[#53fc18] px-5 py-2.5 text-sm font-bold text-black disabled:opacity-50"
          >
            {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Enable Pro (beta — free)
          </button>
        ) : (
          <Link
            href="/support"
            className="inline-flex items-center gap-2 rounded-lg bg-[#15CFF4] px-5 py-2.5 text-sm font-bold text-black"
          >
            Contact support for Pro
          </Link>
        )}
        <Link
          href="/help/stations#embed"
          className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/10"
        >
          What&apos;s included?
        </Link>
      </div>
    </section>
  );
}
