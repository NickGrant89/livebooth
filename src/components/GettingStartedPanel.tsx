"use client";

import { useAuth } from "@/context/AuthContext";
import { GuidanceCard } from "@/components/GuidanceCard";
import {
  FAN_QUICK_START,
  DJ_QUICK_START,
  STATION_QUICK_START,
} from "@/lib/guidance";

export function GettingStartedPanel() {
  const { user, loading } = useAuth();

  if (loading || !user) return null;

  if (user.role === "station") {
    return (
      <div className="mx-4 lg:mx-6 mt-4">
        <GuidanceCard
          title="Station owner — quick start"
          subtitle="Run your radio channel on LiveBooth"
          steps={STATION_QUICK_START}
          role="station"
          variant="dj"
        />
      </div>
    );
  }

  if (user.role === "dj" || user.role === "admin") {
    return (
      <div className="mx-4 lg:mx-6 mt-4">
        <GuidanceCard
          title="DJ quick start"
          subtitle="Four steps to your first successful stream"
          steps={DJ_QUICK_START}
          role={user.role}
          variant="dj"
        />
      </div>
    );
  }

  return (
    <div className="mx-4 lg:mx-6 mt-4">
      <GuidanceCard
        title="New here? Start in 4 steps"
        subtitle="Everything you need as a listener"
        steps={FAN_QUICK_START}
        role="fan"
        variant="fan"
      />
    </div>
  );
}
