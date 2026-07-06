"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  ControlBar,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Loader2, Radio, Wifi } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/fetch-client";

type StudioProps = {
  collabId: string;
  hostUsername: string;
  role: "host" | "partner";
  compositorActive?: boolean;
};

type TokenPayload = {
  token: string;
  url: string;
  room: string;
};

function StudioVideoGrid() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  return (
    <GridLayout tracks={tracks} style={{ minHeight: 240 }}>
      <ParticipantTile />
    </GridLayout>
  );
}

function EgressWatcher({
  collabId,
  compositorActive,
  hostUsername,
}: {
  collabId: string;
  compositorActive?: boolean;
  hostUsername: string;
}) {
  const room = useRoomContext();
  const [status, setStatus] = useState("");
  const [mixActive, setMixActive] = useState(Boolean(compositorActive));

  useEffect(() => {
    setMixActive(Boolean(compositorActive));
  }, [compositorActive]);

  useEffect(() => {
    if (!room) return;

    let cancelled = false;

    async function tick() {
      const res = await apiFetch(`/api/collab/webrtc?collabId=${encodeURIComponent(collabId)}`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as {
        videoPublishers?: number;
        canStartEgress?: boolean;
        compositorActive?: boolean;
        egressHealthy?: boolean;
      };

      if (data.compositorActive) {
        setMixActive(true);
        setStatus("Fan stream is live on the host booth.");
        return;
      }

      if (!data.egressHealthy) {
        setStatus("Egress service restarting on VPS — fan mix may take a minute.");
      } else if ((data.videoPublishers ?? 0) < 2) {
        setStatus("Waiting for both DJs to enable camera in the studio…");
      } else if (data.canStartEgress) {
        setStatus("Starting synced fan mix…");
        const start = await apiFetch("/api/collab/webrtc", {
          method: "POST",
          body: JSON.stringify({ collabId }),
        });
        if (start.ok) {
          const body = (await start.json()) as { egress?: { active?: boolean; reason?: string } };
          if (body.egress?.active) {
            setMixActive(true);
            setStatus("Fan stream is live on the host booth.");
          } else {
            setStatus(`Mix pending (${body.egress?.reason ?? "retry"})…`);
          }
        }
      }
    }

    tick();
    const interval = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [room, collabId]);

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs space-y-1">
      {mixActive ? (
        <p className="text-[#53fc18] font-medium">B2B mix · synced audio (WebRTC)</p>
      ) : (
        <p className="text-amber-400/90">Studio connected — building fan mix…</p>
      )}
      {status && <p className="text-zinc-500">{status}</p>}
      <Link href={`/stream/${hostUsername}`} className="text-[#53fc18] hover:underline inline-block">
        Open fan booth →
      </Link>
    </div>
  );
}

export function CollabWebRtcStudio({ collabId, hostUsername, role, compositorActive }: StudioProps) {
  const [tokenPayload, setTokenPayload] = useState<TokenPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function connect() {
    setLoading(true);
    setError("");
    const res = await apiFetch("/api/livekit/token", {
      method: "POST",
      body: JSON.stringify({ collabId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not join studio");
      return;
    }
    setTokenPayload(data as TokenPayload);
  }

  if (!tokenPayload) {
    return (
      <div className="rounded-xl border border-[#53fc18]/30 bg-[#53fc18]/5 p-4 space-y-3">
        <p className="text-sm font-medium text-[#53fc18] flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          WebRTC studio · low latency
        </p>
        <p className="text-xs text-zinc-400">
          Join from your browser — camera and mic sync in one room. Fans still watch{" "}
          <span className="text-zinc-300">@{hostUsername}</span>&apos;s booth once the mix starts.
          {role === "host" && " Go live on your stream first if you have not already."}
        </p>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="button"
          onClick={connect}
          disabled={loading}
          className="btn-primary rounded-xl px-4 py-2.5 text-sm disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
          Open WebRTC studio
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#53fc18]/30 overflow-hidden bg-black">
      <LiveKitRoom
        token={tokenPayload.token}
        serverUrl={tokenPayload.url}
        connect
        video
        audio
        data-lk-theme="default"
        onError={(e) => setError(e.message)}
      >
        <div className="p-2">
          <StudioVideoGrid />
        </div>
        <ControlBar controls={{ microphone: true, camera: true, screenShare: false }} />
        <RoomAudioRenderer />
        <div className="px-2 pb-2">
          <EgressWatcher
            collabId={collabId}
            compositorActive={compositorActive}
            hostUsername={hostUsername}
          />
        </div>
      </LiveKitRoom>
      {error && <p className="text-xs text-red-400 px-3 pb-3">{error}</p>}
    </div>
  );
}
