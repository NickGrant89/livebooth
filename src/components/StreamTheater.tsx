"use client";

import { useEffect, useState } from "react";
import { StreamPlayer } from "@/components/StreamPlayer";
import { StreamPresence } from "@/components/StreamPresence";
import { CollabPartnerPip } from "@/components/CollabPartnerPip";
import { apiFetch } from "@/lib/fetch-client";

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
  compositorPending?: boolean;
  collabActive?: boolean;
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
  playbackUrl: initialPlaybackUrl,
  startedAt,
  demoPlayback = false,
  station,
  compositorMixed: initialCompositorMixed = false,
  compositorPending: initialCompositorPending = false,
  collabActive = false,
  collabPartner: initialCollabPartner,
}: StreamTheaterProps) {
  const [watching, setWatching] = useState(0);
  const [peak, setPeak] = useState(initialPeak);
  const [playbackUrl, setPlaybackUrl] = useState(initialPlaybackUrl);
  const [compositorMixed, setCompositorMixed] = useState(initialCompositorMixed);
  const [compositorPending, setCompositorPending] = useState(initialCompositorPending);
  const [collabPartner, setCollabPartner] = useState(initialCollabPartner);

  useEffect(() => {
    setPlaybackUrl(initialPlaybackUrl);
    setCompositorMixed(initialCompositorMixed);
    setCompositorPending(initialCompositorPending);
    setCollabPartner(initialCollabPartner);
  }, [initialPlaybackUrl, initialCompositorMixed, initialCompositorPending, initialCollabPartner]);

  useEffect(() => {
    if (!collabActive) return;

    let cancelled = false;

    async function syncCollabPlayback() {
      const res = await apiFetch(`/api/streams/${streamId}/collab-playback`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as {
        playbackUrl?: string | null;
        compositorActive?: boolean;
        compositorPending?: boolean;
        collabPartner?: StreamTheaterProps["collabPartner"];
      };
      if (cancelled) return;
      if (data.playbackUrl) setPlaybackUrl(data.playbackUrl);
      setCompositorMixed(Boolean(data.compositorActive));
      setCompositorPending(Boolean(data.compositorPending));
      setCollabPartner(data.collabPartner ?? null);
    }

    syncCollabPlayback();
    const interval = setInterval(syncCollabPlayback, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [collabActive, streamId]);

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
        {compositorPending && !compositorMixed && (
          <span className="absolute top-14 left-4 z-30 rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300 backdrop-blur-sm">
            Building B2B mix…
          </span>
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
