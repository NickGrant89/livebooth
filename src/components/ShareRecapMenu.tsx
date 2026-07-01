"use client";

import { Download } from "lucide-react";
import { ShareMenu } from "@/components/ShareMenu";
import { buildOgImageUrl } from "@/lib/share";
import type { RecapData } from "@/components/SessionRecapModal";

export function ShareRecapMenu({ recap }: { recap: RecapData }) {
  const cardUrl = buildOgImageUrl({
    type: "recap",
    dj: recap.djName,
    title: recap.title,
    username: recap.djUsername,
    tips: String(recap.totalTips),
    peak: String(recap.peakViewers),
  });

  const safeTitle = recap.title.replace(/[^\w\s-]/g, "").trim().slice(0, 40) || "set-recap";

  return (
    <div className="flex flex-1 gap-2 min-w-0">
      <a
        href={cardUrl}
        download={`livebooth-${safeTitle}.png`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-white/10 flex items-center justify-center gap-1.5 shrink-0"
        title="Download share card (1200×630 PNG)"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Card</span>
      </a>
      <ShareMenu
        kind="recap"
        path={`/vod/${recap.streamId}`}
        djName={recap.djName}
        setTitle={recap.title}
        tips={recap.totalTips}
        peak={recap.peakViewers}
        username={recap.djUsername}
        label="Share set"
        variant="primary"
        className="flex-1 min-w-0"
      />
    </div>
  );
}
