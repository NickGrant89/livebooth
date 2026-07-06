"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { Track, RoomEvent, ConnectionState } from "livekit-client";
import { Camera, Loader2, Radio, Wifi } from "lucide-react";
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

function formatMediaError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Browser blocked camera/mic — allow livebooth.uk in site settings, then tap Turn on camera again.";
    }
    if (err.name === "NotReadableError") {
      return "Camera is in use — close other tabs/apps using the camera, then try again.";
    }
    if (err.name === "NotFoundError") {
      return "No camera found — pick a device from the Camera menu.";
    }
    return `${err.name}: ${err.message}`;
  }

  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : err != null
          ? String(err)
          : "Unknown media error";

  if (/DeviceInUse|NotReadable/i.test(msg)) {
    return "Camera is in use — close other tabs/apps using the camera.";
  }
  if (/PermissionDenied|NotAllowed|permission|denied/i.test(msg)) {
    return "Camera/mic blocked — allow livebooth.uk in browser settings, then try again.";
  }
  if (/notfound|devicesnotfound|overconstrained/i.test(msg)) {
    return "No usable camera — pick a device from the Camera menu.";
  }
  return msg;
}

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

function StudioMediaPrompt({ onError }: { onError: (msg: string) => void }) {
  const room = useRoomContext();
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const enablingRef = useRef(false);

  useEffect(() => {
    if (!room) return;

    const sync = () => setCameraOn(room.localParticipant.isCameraEnabled);
    sync();
    room.on(RoomEvent.LocalTrackPublished, sync);
    room.on(RoomEvent.LocalTrackUnpublished, sync);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, sync);
      room.off(RoomEvent.LocalTrackUnpublished, sync);
    };
  }, [room]);

  const enableMedia = useCallback(async () => {
    if (!room || enablingRef.current) return;
    enablingRef.current = true;
    setBusy(true);
    onError("");
    try {
      if (room.state !== ConnectionState.Connected) {
        throw new Error("Still connecting — wait a moment and try again.");
      }
      await room.localParticipant.setCameraEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(true);
      setCameraOn(room.localParticipant.isCameraEnabled);
    } catch (err) {
      onError(formatMediaError(err));
    } finally {
      setBusy(false);
      enablingRef.current = false;
    }
  }, [room, onError]);

  if (cameraOn) return null;

  return (
    <div className="px-2 pb-2">
      <button
        type="button"
        onClick={enableMedia}
        disabled={busy}
        className="w-full rounded-xl border border-[#53fc18]/40 bg-[#53fc18]/10 px-4 py-3 text-sm font-medium text-[#53fc18] hover:bg-[#53fc18]/15 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        Turn on camera &amp; mic
      </button>
      <p className="text-[10px] text-zinc-500 mt-2 text-center space-y-1">
        <span className="block">
          Both DJs must join this studio on /collab — host OBS/RTMP does not count.
        </span>
        <span className="block">
          One webcam per machine: use a phone for the second DJ if testing solo on one Mac.
        </span>
      </p>
    </div>
  );
}

function StudioConnectionStatus() {
  const room = useRoomContext();
  const [state, setState] = useState<ConnectionState | undefined>(room?.state);

  useEffect(() => {
    if (!room) return;
    const sync = () => setState(room.state);
    sync();
    room.on(RoomEvent.ConnectionStateChanged, sync);
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, sync);
    };
  }, [room]);

  if (!state || state === ConnectionState.Connected) return null;

  const label =
    state === ConnectionState.Connecting
      ? "Connecting to rtc.livebooth.uk…"
      : state === ConnectionState.Reconnecting
        ? "Reconnecting…"
        : state === ConnectionState.Disconnected
          ? "Disconnected — check Wi‑Fi or try again (mobile needs TURN/TLS on VPS)"
          : `Connection: ${state}`;

  return <p className="text-xs text-amber-400/90 px-2 pb-1">{label}</p>;
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
        participantCount?: number;
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

      const inRoom = data.participantCount ?? 0;
      const cameras = data.videoPublishers ?? 0;

      if (!data.egressHealthy) {
        setStatus("Egress service restarting on VPS — fan mix may take a minute.");
      } else if (inRoom < 2) {
        setStatus(
          `${inRoom}/2 DJs in studio — the other DJ must open WebRTC studio on /collab (host RTMP/OBS does not count).`,
        );
      } else if (cameras < 2) {
        setStatus(
          `${cameras}/2 cameras on — tap Turn on camera & mic above (both DJs, in this studio tab).`,
        );
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

type StudioRoomProps = {
  token: string;
  serverUrl: string;
  collabId: string;
  hostUsername: string;
  compositorActive?: boolean;
  onError: (msg: string) => void;
};

/** Inner room — mount once per token so LiveKit does not reconnect on parent re-renders. */
function StudioRoom({
  token,
  serverUrl,
  collabId,
  hostUsername,
  compositorActive,
  onError,
}: StudioRoomProps) {
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const handleRoomError = useCallback((e: Error) => {
    onErrorRef.current(formatMediaError(e));
  }, []);

  const handleMediaDeviceFailure = useCallback((failure?: unknown) => {
    onErrorRef.current(formatMediaError(failure));
  }, []);

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      video={false}
      audio={false}
      data-lk-theme="default"
      onError={handleRoomError}
      onMediaDeviceFailure={handleMediaDeviceFailure}
    >
      <div className="p-2">
        <StudioVideoGrid />
      </div>
      <StudioConnectionStatus />
      <StudioMediaPrompt onError={onError} />
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
  );
}

export function CollabWebRtcStudio({ collabId, hostUsername, role, compositorActive }: StudioProps) {
  const [tokenPayload, setTokenPayload] = useState<TokenPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reportError = useCallback((msg: string) => {
    setError(msg);
  }, []);

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
          {role === "host" &&
            " Host must join this studio too — OBS/RTMP alone does not enter the WebRTC room."}
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
      <StudioRoom
        key={tokenPayload.token}
        token={tokenPayload.token}
        serverUrl={tokenPayload.url}
        collabId={collabId}
        hostUsername={hostUsername}
        compositorActive={compositorActive}
        onError={reportError}
      />
      {error && <p className="text-xs text-red-400 px-3 pb-3">{error}</p>}
    </div>
  );
}
