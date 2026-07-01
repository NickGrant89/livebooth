"use client";

import { GuidanceCard } from "@/components/GuidanceCard";
import { DJ_LIVE_CHECKLIST, DJ_QUICK_START } from "@/lib/guidance";

export function DjSetupChecklist({ isLive }: { isLive: boolean }) {
  if (isLive) {
    return (
      <div className="mb-6">
        <GuidanceCard
          title="While you're live — checklist"
          subtitle="Keep fans engaged and earning DROP"
          steps={DJ_LIVE_CHECKLIST}
          role="dj"
          variant="dj"
          dismissKey="lb_dismiss_dj_live_checklist"
        />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <GuidanceCard
        title="Before your next stream"
        subtitle="Set up once, stream every week"
        steps={DJ_QUICK_START}
        role="dj"
        variant="dj"
        dismissKey="lb_dismiss_dj_setup"
      />
    </div>
  );
}
