"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  Track,
  RoomEvent,
  ConnectionState,
  VideoPresets,
  createLocalTracks,
  type LocalTrack,
  type Room,
  type RoomOptions,
} from "livekit-client";
import { Camera, Loader2, Mic, MicOff, Radio, VideoOff, Wifi } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/fetch-client";

type StudioProps = {
  collabId: string;
  hostUsername: string;
  role: "host" | "partner";
  compositorActive?: boolean;
  hostStreamLive?: boolean;
};

type TokenPayload = {
  token: string;
  url: string;
  room: string;
};

type JoinPhase = "idle" | "joining" | "live";

const ROOM_OPTIONS: RoomOptions = {
  disconnectOnPageLeave: false,
  adaptiveStream: false,
  dynacast: false,
  videoCaptureDefaults: {
    resolution: VideoPresets.h540.resolution,
  },
  publishDefaults: {
    simulcast: false,
  },
};

const JOIN_TIMEOUT_MS = 25_000;

function formatMediaError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Camera/mic blocked — tap Join again and choose Allow when Safari asks.";
    }
    if (err.name === "NotReadableError") {
      return "Camera is in use — close other apps using the camera, then tap Join again.";
    }
    if (err.name === "NotFoundError") {
      return "No camera found on this device.";
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
          : "Unknown error";

  if (/timed out/i.test(msg)) {
    return "Join timed out — check Wi‑Fi, allow camera/mic, then tap Join again.";
  }
  if (/PermissionDenied|NotAllowed|permission|denied/i.test(msg)) {
    return "Camera/mic blocked — allow livebooth.uk in browser settings, then tap Join again.";
  }
  return msg;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

function LocalPreviewVideo({ track }: { track: LocalTrack | null }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !track || track.kind !== Track.Kind.Video) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className="w-full h-full object-cover rounded-lg bg-zinc-900"
      style={{ minHeight: 240, transform: "scaleX(-1)" }}
    />
  );
}

function StudioVideoGrid({ localPreviewTrack }: { localPreviewTrack: LocalTrack | null }) {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: false },
  );

  if (tracks.length === 0) {
    return <LocalPreviewVideo track={localPreviewTrack} />;
  }

  return (
    <GridLayout tracks={tracks} style={{ minHeight: 240 }}>
      <ParticipantTile />
    </GridLayout>
  );
}

function TrackPublisher({
  tracks,
  onError,
  onPublished,
}: {
  tracks: LocalTrack[];
  onError: (msg: string) => void;
  onPublished: () => void;
}) {
  const room = useRoomContext();
  const doneRef = useRef(false);

  useEffect(() => {
    if (!room || doneRef.current) return;

    let cancelled = false;

    async function publish() {
      if (room!.state !== ConnectionState.Connected) return;

      try {
        for (const track of tracks) {
          if (cancelled) return;
          await room!.localParticipant.publishTrack(track, {
            source: track.kind === Track.Kind.Video ? Track.Source.Camera : Track.Source.Microphone,
          });
        }
        if (!cancelled) {
          doneRef.current = true;
          onPublished();
        }
      } catch (err) {
        if (!cancelled) onError(formatMediaError(err));
      }
    }

    if (room.state === ConnectionState.Connected) {
      void publish();
    } else {
      const onConnected = () => void publish();
      room.on(RoomEvent.Connected, onConnected);
      return () => {
        cancelled = true;
        room.off(RoomEvent.Connected, onConnected);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [room, tracks, onError, onPublished]);

  return null;
}

function StudioControls() {
  const room = useRoomContext();
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!room) return;
    const sync = () => {
      setMicOn(room.localParticipant.isMicrophoneEnabled);
      setCameraOn(room.localParticipant.isCameraEnabled);
    };
    sync();
    room.on(RoomEvent.LocalTrackPublished, sync);
    room.on(RoomEvent.LocalTrackUnpublished, sync);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, sync);
      room.off(RoomEvent.LocalTrackUnpublished, sync);
    };
  }, [room]);

  const toggleMic = useCallback(async () => {
    if (!room || busyRef.current) return;
    busyRef.current = true;
    try {
      await room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);
      setMicOn(room.localParticipant.isMicrophoneEnabled);
    } finally {
      busyRef.current = false;
    }
  }, [room]);

  const toggleCamera = useCallback(async () => {
    if (!room || busyRef.current) return;
    busyRef.current = true;
    try {
      await room.localParticipant.setCameraEnabled(!room.localParticipant.isCameraEnabled);
      setCameraOn(room.localParticipant.isCameraEnabled);
    } finally {
      busyRef.current = false;
    }
  }, [room]);

  return (
    <div className="px-2 pb-2 flex gap-2">
      <button
        type="button"
        onClick={toggleMic}
        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs flex items-center justify-center gap-2"
      >
        {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-400" />}
        Mic
      </button>
      <button
        type="button"
        onClick={toggleCamera}
        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs flex items-center justify-center gap-2"
      >
        {cameraOn ? <Camera className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-red-400" />}
        Camera
      </button>
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
      ? "Connecting to studio…"
      : state === ConnectionState.Reconnecting
        ? "Reconnecting…"
        : state === ConnectionState.Disconnected
          ? "Disconnected — reload /collab and tap Join again"
          : `Connection: ${state}`;

  return <p className="text-xs text-amber-400/90 px-2 pb-1">{label}</p>;
}

function EgressWatcher({
  collabId,
  compositorActive,
  hostUsername,
  hostStreamLive,
  role,
}: {
  collabId: string;
  compositorActive?: boolean;
  hostUsername: string;
  hostStreamLive?: boolean;
  role: "host" | "partner";
}) {
  const room = useRoomContext();
  const [status, setStatus] = useState("");
  const [mixActive, setMixActive] = useState(Boolean(compositorActive));
  const [localCamera, setLocalCamera] = useState(false);
  const egressBusyRef = useRef(false);
  const lastEgressAttemptRef = useRef(0);

  useEffect(() => {
    setMixActive(Boolean(compositorActive));
  }, [compositorActive]);

  useEffect(() => {
    if (!room) return;
    const sync = () => setLocalCamera(room.localParticipant.isCameraEnabled);
    sync();
    room.on(RoomEvent.LocalTrackPublished, sync);
    room.on(RoomEvent.LocalTrackUnpublished, sync);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, sync);
      room.off(RoomEvent.LocalTrackUnpublished, sync);
    };
  }, [room]);

  useEffect(() => {
    if (!room) return;

    let cancelled = false;

    async function tick() {
      const res = await apiFetch(`/api/collab/webrtc?collabId=${encodeURIComponent(collabId)}`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as {
        connectedDjs?: number;
        participantCount?: number;
        videoPublishers?: number;
        hostInStudio?: boolean;
        partnerInStudio?: boolean;
        canStartEgress?: boolean;
        compositorActive?: boolean;
        egressHealthy?: boolean;
      };

      if (data.compositorActive) {
        setMixActive(true);
        setStatus("Fan stream is live on the host booth.");
        return;
      }

      const hostOk =
        data.hostInStudio ?? (role === "host" && room!.state === ConnectionState.Connected);
      const partnerOk =
        data.partnerInStudio ?? (role === "partner" && room!.state === ConnectionState.Connected);
      const cameras = data.videoPublishers ?? 0;

      if (!localCamera) {
        setStatus("Turn your camera on using the Camera button below.");
        return;
      }
      if (!hostOk) {
        setStatus("Waiting for host to join this studio on /collab (Mac or phone).");
        return;
      }
      if (!partnerOk) {
        setStatus("Waiting for partner to join /collab on their phone and tap Join.");
        return;
      }
      if (cameras < 2) {
        setStatus(`${cameras}/2 cameras on — both DJs need camera enabled.`);
        return;
      }
      if (!data.egressHealthy) {
        setStatus("Mix server warming up — may take a minute.");
        return;
      }
      if (data.canStartEgress) {
        const now = Date.now();
        if (egressBusyRef.current || now - lastEgressAttemptRef.current < 15_000) {
          setStatus("Starting synced fan mix…");
          return;
        }
        egressBusyRef.current = true;
        lastEgressAttemptRef.current = now;
        setStatus("Starting synced fan mix…");
        const start = await apiFetch("/api/collab/webrtc", {
          method: "POST",
          body: JSON.stringify({ collabId }),
        });
        egressBusyRef.current = false;
        if (start.ok) {
          const body = (await start.json()) as { egress?: { active?: boolean; reason?: string } };
          if (body.egress?.active) {
            setMixActive(true);
            setStatus("Fan mix is live — open the booth page to watch.");
          } else {
            setStatus(`Mix failed (${body.egress?.reason ?? "retry"}) — wait and keep both cameras on.`);
          }
        } else {
          setStatus("Could not start mix — keep both cameras on and wait.");
        }
        return;
      }

      setStatus(`${cameras}/2 cameras · waiting to start mix…`);
    }

    tick();
    const interval = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [room, collabId, role, localCamera]);

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs space-y-1">
      {mixActive ? (
        <p className="text-[#53fc18] font-medium">B2B mix live</p>
      ) : (
        <p className="text-amber-400/90 font-medium">{status || "Connected — waiting for both DJs…"}</p>
      )}
      {hostStreamLive ? (
        <Link href={`/stream/${hostUsername}`} className="text-[#53fc18] hover:underline inline-block">
          Open fan booth →
        </Link>
      ) : role === "host" ? (
        <p className="text-zinc-500">
          Optional: publish from{" "}
          <Link href="/go-live" className="text-[#53fc18] hover:underline">
            Go Live
          </Link>{" "}
          so fans see the LIVE badge (mix works without OBS).
        </p>
      ) : null}
    </div>
  );
}

type StudioRoomProps = {
  collabId: string;
  token: string;
  serverUrl: string;
  hostUsername: string;
  role: "host" | "partner";
  compositorActive?: boolean;
  hostStreamLive?: boolean;
  localTracks: LocalTrack[];
  localPreviewTrack: LocalTrack | null;
  onError: (msg: string) => void;
  onPublished: () => void;
};

function StudioRoom({
  collabId,
  token,
  serverUrl,
  hostUsername,
  role,
  compositorActive,
  hostStreamLive,
  localTracks,
  localPreviewTrack,
  onError,
  onPublished,
}: StudioRoomProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      video={false}
      audio={false}
      options={ROOM_OPTIONS}
      data-lk-theme="default"
      onError={(e) => onError(formatMediaError(e))}
      onMediaDeviceFailure={(f) => onError(formatMediaError(f))}
    >
      <TrackPublisher tracks={localTracks} onError={onError} onPublished={onPublished} />
      <div className="p-2">
        <StudioVideoGrid localPreviewTrack={localPreviewTrack} />
      </div>
      <StudioConnectionStatus />
      <StudioControls />
      <RoomAudioRenderer />
      <div className="px-2 pb-2">
        <EgressWatcher
          collabId={collabId}
          compositorActive={compositorActive}
          hostUsername={hostUsername}
          hostStreamLive={hostStreamLive}
          role={role}
        />
      </div>
    </LiveKitRoom>
  );
}

export function CollabWebRtcStudio({
  collabId,
  hostUsername,
  role,
  compositorActive,
  hostStreamLive,
}: StudioProps) {
  const [phase, setPhase] = useState<JoinPhase>("idle");
  const [tokenPayload, setTokenPayload] = useState<TokenPayload | null>(null);
  const [localTracks, setLocalTracks] = useState<LocalTrack[]>([]);
  const [error, setError] = useState("");
  const studioInstanceIdRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`,
  );
  const tracksRef = useRef<LocalTrack[]>([]);

  const stopTracks = useCallback(() => {
    for (const track of tracksRef.current) {
      track.stop();
    }
    tracksRef.current = [];
    setLocalTracks([]);
  }, []);

  const reportError = useCallback(
    (msg: string) => {
      setError(msg);
      setPhase("idle");
      setTokenPayload(null);
      stopTracks();
    },
    [stopTracks],
  );

  async function joinStudio() {
    setPhase("joining");
    setError("");
    stopTracks();

    try {
      const tracks = await withTimeout(
        createLocalTracks({
          audio: true,
          video: { facingMode: "user" },
        }),
        JOIN_TIMEOUT_MS,
        "Camera/mic",
      );

      tracksRef.current = tracks;
      setLocalTracks(tracks);

      const res = await withTimeout(
        apiFetch("/api/livekit/token", {
          method: "POST",
          body: JSON.stringify({ collabId, studioInstanceId: studioInstanceIdRef.current }),
        }),
        15_000,
        "Studio login",
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not join studio");
      }

      setTokenPayload(data as TokenPayload);
      setPhase("live");
    } catch (err) {
      stopTracks();
      setTokenPayload(null);
      setPhase("idle");
      setError(formatMediaError(err));
    }
  }

  const localPreviewTrack =
    localTracks.find((t) => t.kind === Track.Kind.Video) ?? null;

  if (phase !== "live" || !tokenPayload) {
    return (
      <div className="rounded-xl border border-[#53fc18]/30 bg-[#53fc18]/5 p-4 space-y-3">
        <p className="text-sm font-medium text-[#53fc18] flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          {role === "host" ? "Host" : "Partner"} collab studio
        </p>
        <p className="text-xs text-zinc-400">
          One tap joins the studio and turns on camera + mic.{" "}
          {role === "host"
            ? "Do this on your Mac — OBS does not count."
            : "Do this on your phone — keep this tab open."}
        </p>
        {phase === "joining" && (
          <div className="rounded-lg bg-black/40 p-3 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#53fc18] mx-auto mb-2" />
            <p className="text-xs text-amber-200">Allow camera &amp; mic when your browser asks…</p>
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="button"
          onClick={joinStudio}
          disabled={phase === "joining"}
          className="btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {phase === "joining" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Radio className="h-4 w-4" />
          )}
          {phase === "joining" ? "Joining studio…" : "Join collab studio (camera + mic)"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#53fc18]/30 overflow-hidden bg-black">
      <StudioRoom
        key={collabId}
        collabId={collabId}
        token={tokenPayload.token}
        serverUrl={tokenPayload.url}
        hostUsername={hostUsername}
        role={role}
        compositorActive={compositorActive}
        hostStreamLive={hostStreamLive}
        localTracks={localTracks}
        localPreviewTrack={localPreviewTrack}
        onError={reportError}
        onPublished={() => setError("")}
      />
      {error && <p className="text-xs text-red-400 px-3 pb-3">{error}</p>}
    </div>
  );
}
