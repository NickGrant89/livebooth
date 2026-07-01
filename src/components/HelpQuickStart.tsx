"use client";

import { GuidanceCard } from "@/components/GuidanceCard";
import {
  FAN_QUICK_START,
  DJ_QUICK_START,
  STATION_QUICK_START,
} from "@/lib/guidance";

export function HelpQuickStart({ role }: { role: "fan" | "dj" | "station" }) {
  const config = {
    fan: {
      title: "Quick start — 4 steps",
      subtitle: "Do this first, then read the sections below",
      steps: FAN_QUICK_START,
      variant: "fan" as const,
    },
    dj: {
      title: "Quick start — 4 steps",
      subtitle: "Your path from signup to first paid set",
      steps: DJ_QUICK_START,
      variant: "dj" as const,
    },
    station: {
      title: "Station quick start",
      subtitle: "Launch your branded radio channel",
      steps: STATION_QUICK_START,
      variant: "dj" as const,
    },
  }[role];

  return (
    <div className="mb-8">
      <GuidanceCard
        title={config.title}
        subtitle={config.subtitle}
        steps={config.steps}
        role={role}
        variant={config.variant}
        dismissKey={`lb_dismiss_help_quick_${role}`}
      />
    </div>
  );
}
