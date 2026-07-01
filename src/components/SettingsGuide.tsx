"use client";

import { useAuth } from "@/context/AuthContext";
import { GuidanceCard } from "@/components/GuidanceCard";
import {
  FAN_QUICK_START,
  DJ_QUICK_START,
  STATION_QUICK_START,
} from "@/lib/guidance";

export function SettingsGuide() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === "station") {
    return (
      <GuidanceCard
        title="Station settings checklist"
        subtitle="Configure your channel before booking residents"
        steps={STATION_QUICK_START}
        role="station"
        variant="dj"
        dismissKey="lb_dismiss_settings_station"
      />
    );
  }

  if (user.role === "dj" || user.role === "admin") {
    return (
      <GuidanceCard
        title="DJ profile checklist"
        subtitle="Complete these in Settings for a better Discover presence"
        steps={[
          {
            title: "Display name & avatar",
            body: "Fans recognize you in chat and on cards — fill these in below.",
          },
          {
            title: "Genres & bio",
            body: "Pick genres you actually play. A short bio helps new listeners follow.",
          },
          ...DJ_QUICK_START.slice(1),
        ]}
        role={user.role}
        variant="dj"
        dismissKey="lb_dismiss_settings_dj"
      />
    );
  }

  return (
    <GuidanceCard
      title="Fan settings — what to turn on"
      subtitle="Get the most from LiveBooth"
      steps={[
        {
          title: "Enable push alerts",
          body: "Turn on go-live notifications below so you never miss a set from DJs you follow.",
        },
        ...FAN_QUICK_START.slice(1),
      ]}
      role="fan"
      variant="fan"
      dismissKey="lb_dismiss_settings_fan"
    />
  );
}
