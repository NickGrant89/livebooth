"use client";

import { useState } from "react";
import { StreamPlayer } from "@/components/StreamPlayer";
import { StreamPresence } from "@/components/StreamPresence";
import { CollabPartnerPip } from "@/components/CollabPartnerPip";

interface StreamTheaterProps {
  streamId: string;
  djName: string;
  streamTitle: string;
  initialPeak?: number;
  playbackUrl?: string | null;
  startedAt?: string | null;
  demoPlayback?: boolean;
  station?: { slug: string; name: string; avatar: string; avatarUrl?: string | null } | null;
  compositorMixed?: boolean;
  collabPartner?: {
    name: string;
    playbackUrl: string;
    ingestKey?: string | null;
  } | null;
}

export function StreamTheater({
  streamId,
  djName,
  streamTitle,
  initialPeak = 0,
  playbackUrl,
  startedAt,
  demoPlayback = false,
  station,
  compositorMixed = false,
  collabPartner,
}: StreamTheaterProps) {
  const [watching, setWatching] = useState(0);
  const [peak, setPeak] = useState(initialPeak);

  return (
    <>
      <StreamPresence
        streamId={streamId}
        onViewersChange={(w, p) => {
          setWatching(w);
          setPeak(p);
        }}
      />
      <div className="relative">
        <StreamPlayer
          djName={djName}
          streamTitle={streamTitle}
          viewers={watching}
          peakViewers={peak}
          playbackUrl={playbackUrl}
          isLive
          startedAt={startedAt}
          demoPlayback={demoPlayback}
          station={station}
        />
        {collabPartner?.playbackUrl && (
          <CollabPartnerPip
            playbackUrl={collabPartner.playbackUrl}
            ingestKey={collabPartner.ingestKey}
            partnerName={collabPartner.name}
          />
        )}
        {compositorMixed && (
          <span className="absolute top-14 left-4 z-30 rounded-md bg-[#53fc18]/20 border border-[#53fc18]/40 px-2 py-0.5 text-[10px] font-bold uppercase text-[#53fc18] backdrop-blur-sm">
            B2B mix · synced audio
          </span>
        )}
      </div>
    </>
  );
}
