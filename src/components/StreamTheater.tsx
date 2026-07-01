"use client";

import { useState } from "react";
import { StreamPlayer } from "@/components/StreamPlayer";
import { StreamPresence } from "@/components/StreamPresence";

interface StreamTheaterProps {
  streamId: string;
  djName: string;
  streamTitle: string;
  initialPeak?: number;
  playbackUrl?: string | null;
  startedAt?: string | null;
  demoPlayback?: boolean;
  station?: { slug: string; name: string; avatar: string } | null;
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
    </>
  );
}
