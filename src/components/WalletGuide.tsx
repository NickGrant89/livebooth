"use client";

import { GuidanceCard } from "@/components/GuidanceCard";
import { FAN_WALLET_TIPS } from "@/lib/guidance";

export function WalletGuide() {
  return (
    <div className="mb-6">
      <GuidanceCard
        title="How DROP works in your wallet"
        subtitle="Tips, unlocks, and top-ups"
        steps={FAN_WALLET_TIPS.map((body, i) => ({
          title: i === 0 ? "Booth currency" : i === 1 ? "Get more DROP" : "History",
          body,
        }))}
        role="fan"
        variant="fan"
        dismissKey="lb_dismiss_wallet_guide"
      />
    </div>
  );
}
