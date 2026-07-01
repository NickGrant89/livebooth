"use client";

import { GuidanceCard } from "@/components/GuidanceCard";
import { FAN_STREAM_TIPS } from "@/lib/guidance";

export function StreamViewerGuide() {
  return (
    <div className="border-b border-white/[0.06] p-4">
      <GuidanceCard
        title="Watching this set"
        subtitle="Quick tips for listeners"
        steps={FAN_STREAM_TIPS}
        role="fan"
        variant="fan"
        compact
        dismissKey="lb_dismiss_stream_tips"
      />
    </div>
  );
}
