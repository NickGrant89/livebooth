"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  DROP_TOKEN_SYMBOL,
  MEMBER_TIER_PRICES,
  type MemberTier,
} from "@/lib/constants";

export function MembershipTierPicker({
  selected,
  onSelect,
  variant = "dj",
}: {
  selected: MemberTier;
  onSelect: (tier: MemberTier) => void;
  variant?: "dj" | "station";
}) {
  const tiers: { id: MemberTier; perks: readonly string[] }[] = [
    {
      id: "member",
      perks:
        variant === "station"
          ? [
              "10% off unlocks & requests",
              "Station member badge",
              "24h early replays",
              "75% supports the station monthly",
            ]
          : [
              "10% off unlocks & requests",
              "Member badge in chat",
              "12h early replays",
              "85% supports the DJ monthly",
            ],
    },
    {
      id: "supporter",
      perks:
        variant === "station"
          ? [
              "20% off unlocks, 15% off requests",
              "Request queue priority",
              "Supporter badge",
              "75% station + 10% live DJ when on air",
            ]
          : [
              "20% off unlocks, 15% off requests",
              "Request queue priority",
              "Supporter badge",
              "85% supports the DJ monthly",
            ],
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {tiers.map((t) => {
        const active = selected === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              active
                ? "border-[#53fc18]/50 bg-[#53fc18]/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-white capitalize">{t.id}</span>
              <span className="text-sm font-bold text-[#53fc18]">
                {MEMBER_TIER_PRICES[t.id]} {DROP_TOKEN_SYMBOL}/mo
              </span>
            </div>
            <ul className="mt-2 space-y-1">
              {t.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-1 text-[10px] text-zinc-400">
                  <Check className="h-3 w-3 shrink-0 text-[#53fc18] mt-0.5" />
                  {perk}
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
