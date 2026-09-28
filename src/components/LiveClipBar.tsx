"use client";

import { ServerClipPanel } from "@/components/ServerClipPanel";

export function LiveClipBar({
  streamId,
  isHost,
  setTitle,
  djUsername,
}: {
  streamId: string;
  isHost: boolean;
  setTitle: string;
  djUsername: string;
}) {
  return (
    <div className="mt-4">
      <ServerClipPanel
        streamId={streamId}
        mode="live_tail"
        title={setTitle}
        djUsername={djUsername}
        compact={!isHost}
      />
      {!isHost && (
        <p className="text-[10px] text-zinc-600 mt-2 text-center">
          Clip the last 30–60 seconds and share to TikTok or Stories.
        </p>
      )}
    </div>
  );
}
