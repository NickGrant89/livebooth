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
  Room,
  type LocalTrack,
  type RoomOptions,
} from "livekit-client";
import { Camera, Loader2, Mic, MicOff, Radio, VideoOff, Wifi } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/fetch-client";

type StudioProps = {
  mode?: "collab" | "sandbox";
  collabId?: string;
  hostUsername?: string;
  role?: "host" | "partner";
  compositorActive?: boolean;
  hostStreamLive?: boolean;
};

type TokenPayload = {
  token: string;
  url: string;
  room: string;
};

type JoinPhase = "idle" | "joining" | "live";

type JoinStep = "camera" | "login" | "connect" | "publish" | "done";

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
  if (/failed to connect|websocket|pc connection/i.test(msg)) {
    return "Could not reach the studio server — check network or try again in a minute.";
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

function joinStepLabel(step: JoinStep): string {
  switch (step) {
    case "camera":
      return "Allow camera & mic when your browser asks…";
    case "login":
      return "Signing in to studio…";
    case "connect":
      return "Connecting to rtc.livebooth.uk…";
    case "publish":
      return "Publishing your camera…";
    case "done":
      return "Connected";
  }
}

function localCameraLive(room: Room | null): boolean {
  if (!room) return false;
  const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
  return Boolean(pub?.track && !pub.isMuted);
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
    room.on(RoomEvent.TrackMuted, sync);
    room.on(RoomEvent.TrackUnmuted, sync);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, sync);
      room.off(RoomEvent.LocalTrackUnpublished, sync);
      room.off(RoomEvent.TrackMuted, sync);
      room.off(RoomEvent.TrackUnmuted, sync);
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
      ? "Reconnecting to studio…"
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
  const [debug, setDebug] = useState("");
  const egressBusyRef = useRef(false);
  const lastEgressAttemptRef = useRef(0);

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
        connectedDjs?: number;
        videoPublishers?: number;
        hostInStudio?: boolean;
        partnerInStudio?: boolean;
        canStartEgress?: boolean;
        compositorActive?: boolean;
        egressHealthy?: boolean;
      };

      setDebug(
        `room: host=${data.hostInStudio ? "yes" : "no"} partner=${data.partnerInStudio ? "yes" : "no"} · cameras=${data.videoPublishers ?? 0}/2`,
      );

      if (data.compositorActive) {
        setMixActive(true);
        setStatus("Fan stream is live on the host booth.");
        return;
      }

      const hostOk = data.hostInStudio ?? false;
      const partnerOk = data.partnerInStudio ?? false;
      const cameras = data.videoPublishers ?? 0;
      const cameraLive = localCameraLive(room!);

      if (!cameraLive) {
        setStatus("Your camera is not publishing — tap Join again or turn Camera on below.");
        return;
      }
      if (!hostOk) {
        setStatus("Waiting for host to tap Join on /collab (Mac or phone).");
        return;
      }
      if (!partnerOk) {
        setStatus("Waiting for partner to tap Join on /collab on their phone.");
        return;
      }
      if (cameras < 2) {
        setStatus(`${cameras}/2 cameras live — both DJs need camera on.`);
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
            setStatus(`Mix failed (${body.egress?.reason ?? "retry"}) — keep both cameras on.`);
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
  }, [room, collabId, role]);

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs space-y-1">
      {mixActive ? (
        <p className="text-[#53fc18] font-medium">B2B mix live</p>
      ) : (
        <p className="text-amber-400/90 font-medium">{status || "Connected — waiting for both DJs…"}</p>
      )}
      {debug && !mixActive && <p className="text-zinc-600 font-mono text-[10px]">{debug}</p>}
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
  mode: "collab" | "sandbox";
  collabId?: string;
  room: Room;
  token: string;
  serverUrl: string;
  hostUsername?: string;
  role?: "host" | "partner";
  compositorActive?: boolean;
  hostStreamLive?: boolean;
  localPreviewTrack: LocalTrack | null;
  onError: (msg: string) => void;
};

function StudioRoom({
  mode,
  collabId,
  room,
  token,
  serverUrl,
  hostUsername,
  role,
  compositorActive,
  hostStreamLive,
  localPreviewTrack,
  onError,
}: StudioRoomProps) {
  return (
    <LiveKitRoom
      room={room}
      token={token}
      serverUrl={serverUrl}
      connect={false}
      video={false}
      audio={false}
      options={ROOM_OPTIONS}
      data-lk-theme="default"
      onError={(e) => onError(formatMediaError(e))}
      onMediaDeviceFailure={(f) => onError(formatMediaError(f))}
      onDisconnected={() => onError("Studio disconnected — tap Join again.")}
    >
      <div className="p-2">
        <StudioVideoGrid localPreviewTrack={localPreviewTrack} />
      </div>
      <StudioConnectionStatus />
      <StudioControls />
      <RoomAudioRenderer />
      {mode === "collab" && collabId && hostUsername && role ? (
        <div className="px-2 pb-2">
          <EgressWatcher
            collabId={collabId}
            compositorActive={compositorActive}
            hostUsername={hostUsername}
            hostStreamLive={hostStreamLive}
            role={role}
          />
        </div>
      ) : (
        <div className="px-2 pb-2">
          <p className="text-xs text-[#53fc18] rounded-lg border border-[#53fc18]/20 bg-[#53fc18]/5 px-3 py-2">
            Sandbox OK — camera and LiveKit work. Set up a real collab below to test the fan mix.
          </p>
        </div>
      )}
    </LiveKitRoom>
  );
}

export function CollabWebRtcStudio({
  mode = "collab",
  collabId,
  hostUsername,
  role = "host",
  compositorActive,
  hostStreamLive,
}: StudioProps) {
  const [phase, setPhase] = useState<JoinPhase>("idle");
  const [joinStep, setJoinStep] = useState<JoinStep>("camera");
  const [tokenPayload, setTokenPayload] = useState<TokenPayload | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [localTracks, setLocalTracks] = useState<LocalTrack[]>([]);
  const [error, setError] = useState("");
  const studioInstanceIdRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`,
  );
  const tracksRef = useRef<LocalTrack[]>([]);
  const roomRef = useRef<Room | null>(null);

  const stopTracks = useCallback(() => {
    for (const track of tracksRef.current) {
      track.stop();
    }
    tracksRef.current = [];
    setLocalTracks([]);
  }, []);

  const teardownRoom = useCallback(() => {
    const r = roomRef.current;
    roomRef.current = null;
    setRoom(null);
    if (r) {
      void r.disconnect(true);
    }
  }, []);

  const reportError = useCallback(
    (msg: string) => {
      setError(msg);
      setPhase("idle");
      setTokenPayload(null);
      teardownRoom();
      stopTracks();
    },
    [stopTracks, teardownRoom],
  );

  useEffect(() => {
    return () => {
      stopTracks();
      const r = roomRef.current;
      if (r) void r.disconnect(true);
    };
  }, [stopTracks]);

  async function joinStudio() {
    setPhase("joining");
    setJoinStep("camera");
    setError("");
    stopTracks();
    teardownRoom();

    let activeRoom: Room | null = null;

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

      setJoinStep("login");
      const tokenEndpoint = mode === "sandbox" ? "/api/livekit/sandbox" : "/api/livekit/token";
      const tokenBody =
        mode === "sandbox"
          ? JSON.stringify({ studioInstanceId: studioInstanceIdRef.current })
          : JSON.stringify({ collabId, studioInstanceId: studioInstanceIdRef.current });

      if (mode === "collab" && !collabId) {
        throw new Error("Collab not ready — complete setup on /collab/test first.");
      }

      const res = await withTimeout(
        apiFetch(tokenEndpoint, {
          method: "POST",
          body: tokenBody,
        }),
        15_000,
        "Studio login",
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not join studio");
      }

      setJoinStep("connect");
      activeRoom = new Room(ROOM_OPTIONS);
      roomRef.current = activeRoom;

      activeRoom.on(RoomEvent.Disconnected, () => {
        if (roomRef.current === activeRoom) {
          reportError("Studio disconnected — tap Join again.");
        }
      });

      await withTimeout(
        activeRoom.connect(data.url, data.token),
        JOIN_TIMEOUT_MS,
        "LiveKit connect",
      );

      setJoinStep("publish");
      for (const track of tracks) {
        await activeRoom.localParticipant.publishTrack(track, {
          source: track.kind === Track.Kind.Video ? Track.Source.Camera : Track.Source.Microphone,
        });
      }

      if (!localCameraLive(activeRoom)) {
        throw new Error("Camera published but not live — tap Join again.");
      }

      setJoinStep("done");
      setTokenPayload(data as TokenPayload);
      setRoom(activeRoom);
      setPhase("live");
    } catch (err) {
      stopTracks();
      if (activeRoom) {
        void activeRoom.disconnect(true);
        if (roomRef.current === activeRoom) roomRef.current = null;
      }
      setRoom(null);
      setTokenPayload(null);
      setPhase("idle");
      setError(formatMediaError(err));
    }
  }

  const localPreviewTrack = localTracks.find((t) => t.kind === Track.Kind.Video) ?? null;

  if (phase !== "live" || !tokenPayload || !room) {
    return (
      <div className="rounded-xl border border-[#53fc18]/30 bg-[#53fc18]/5 p-4 space-y-3">
        <p className="text-sm font-medium text-[#53fc18] flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          {mode === "sandbox"
            ? "Camera + LiveKit test"
            : `${role === "host" ? "Host" : "Partner"} collab studio`}
        </p>
        <p className="text-xs text-zinc-400">
          {mode === "sandbox"
            ? "No partner needed — confirms your browser can reach the studio server."
            : `One tap joins the studio and turns on camera + mic. ${
                role === "host"
                  ? "Do this on your Mac — OBS does not count."
                  : "Do this on your phone — keep this tab open."
              }`}
        </p>
        {phase === "joining" && (
          <div className="rounded-lg bg-black/40 p-3 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#53fc18] mx-auto mb-2" />
            <p className="text-xs text-amber-200">{joinStepLabel(joinStep)}</p>
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
          {phase === "joining" ? "Joining studio…" : mode === "sandbox" ? "Test my camera" : "Join collab studio (camera + mic)"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#53fc18]/30 overflow-hidden bg-black">
      <StudioRoom
        key={`${mode}-${collabId ?? "sandbox"}-${studioInstanceIdRef.current}`}
        mode={mode}
        collabId={collabId}
        room={room}
        token={tokenPayload.token}
        serverUrl={tokenPayload.url}
        hostUsername={hostUsername}
        role={role}
        compositorActive={compositorActive}
        hostStreamLive={hostStreamLive}
        localPreviewTrack={localPreviewTrack}
        onError={reportError}
      />
      {error && <p className="text-xs text-red-400 px-3 pb-3">{error}</p>}
    </div>
  );
}
