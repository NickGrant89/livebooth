"use client";

import { Share2 } from "lucide-react";
import { ShareLiveButton } from "@/components/ShareLiveButton";
import { StreamBoothLink } from "@/components/StreamBoothLink";

export function ShareReminderBanner({
  username,
  djName,
  setTitle,
  showBoothLink = true,
}: {
  username: string;
  djName: string;
  setTitle: string;
  showBoothLink?: boolean;
}) {
  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[#53fc18]/25 bg-[#53fc18]/10 px-4 py-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Share2 className="h-4 w-4 text-[#53fc18] shrink-0 mt-0.5" />
          <p className="text-sm text-zinc-200">
            <strong className="text-white">You&apos;re live.</strong> Share your booth link so fans can find the set.
          </p>
        </div>
        <ShareLiveButton
          username={username}
          djName={djName}
          setTitle={setTitle}
          variant="primary"
          label="Share now"
        />
      </div>
      {showBoothLink && <StreamBoothLink username={username} />}
    </div>
  );
}
