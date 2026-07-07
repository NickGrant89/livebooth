"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RoomAudioRenderer,
  RoomContext,
  useRoomContext,
  useParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  Track,
  RoomEvent,
  ConnectionState,
  ParticipantEvent,
  VideoPresets,
  createLocalTracks,
  Room,
  type LocalTrack,
  type RoomOptions,
  type VideoCaptureOptions,
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
  onPhaseChange?: (phase: JoinPhase) => void;
};

type TokenPayload = {
  token: string;
  url: string;
  room: string;
};

type JoinPhase = "idle" | "joining" | "live";

type JoinStep = "camera" | "login" | "connect" | "publish" | "done";

const JOIN_TIMEOUT_MS = 25_000;
const JOIN_TIMEOUT_MOBILE_MS = 45_000;

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function roomOptionsForDevice(): RoomOptions {
  const mobile = isMobileDevice();
  return {
    disconnectOnPageLeave: false,
    adaptiveStream: mobile,
    dynacast: false,
    videoCaptureDefaults: {
      resolution: mobile ? VideoPresets.h360.resolution : VideoPresets.h540.resolution,
    },
    publishDefaults: {
      simulcast: false,
      videoCodec: "h264",
    },
  };
}

function joinTimeoutMs(): number {
  return isMobileDevice() ? JOIN_TIMEOUT_MOBILE_MS : JOIN_TIMEOUT_MS;
}

async function waitForRoomConnected(room: Room, ms: number): Promise<void> {
  if (room.state === ConnectionState.Connected) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("LiveKit connect timed out waiting for room")), ms);
    const onConnected = () => {
      clearTimeout(timer);
      room.off(RoomEvent.Connected, onConnected);
      resolve();
    };
    room.on(RoomEvent.Connected, onConnected);
  });
}

function subscribeRemoteParticipants(room: Room) {
  room.remoteParticipants.forEach((participant) => {
    participant.trackPublications.forEach((pub) => {
      pub.setSubscribed(true);
    });
  });
}

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
  if (/failed to connect|websocket|pc connection|manager is closed|peerconnection|ice/i.test(msg)) {
    if (isMobileDevice()) {
      return "Phone lost studio connection — use Wi‑Fi if on cellular, keep Safari open, then tap Join again.";
    }
    return "Studio connection lost — tap Join again.";
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

function videoConstraints(): boolean | VideoCaptureOptions {
  if (typeof navigator === "undefined") return true;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return isMobile ? { facingMode: "user" } : true;
}

async function acquireLocalTracks(): Promise<LocalTrack[]> {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    throw new Error("Camera requires HTTPS — use https://livebooth.uk");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera not supported in this browser — use Safari or Chrome.");
  }

  try {
    return await createLocalTracks({
      audio: true,
      video: videoConstraints(),
    });
  } catch (first) {
    // Mac/desktop fallback — strict facingMode can fail on external webcams
    if (videoConstraints() !== true) {
      return createLocalTracks({ audio: true, video: true });
    }
    throw first;
  }
}

function attachTrackToVideo(track: LocalTrack | null, el: HTMLVideoElement | null) {
  if (!el || !track || track.kind !== Track.Kind.Video) return () => {};

  const mediaStream =
    "mediaStream" in track && track.mediaStream instanceof MediaStream
      ? track.mediaStream
      : null;

  if (mediaStream) {
    el.srcObject = mediaStream;
    void el.play().catch(() => {});
    return () => {
      el.srcObject = null;
    };
  }

  track.attach(el);
  void el.play().catch(() => {});
  return () => {
    track.detach(el);
  };
}

function LocalPreviewVideo({ track }: { track: LocalTrack | null }) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => attachTrackToVideo(track, videoEl), [track, videoEl]);

  return (
    <video
      ref={setVideoEl}
      autoPlay
      muted
      playsInline
      className="w-full h-full object-cover rounded-lg bg-zinc-900"
      style={{ minHeight: 200, transform: "scaleX(-1)" }}
    />
  );
}

function RemoteParticipantVideo({
  participant,
  name,
}: {
  participant: import("livekit-client").RemoteParticipant;
  name: string;
}) {
  const [, refresh] = useState(0);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    const bump = () => refresh((n) => n + 1);
    participant.on(ParticipantEvent.TrackSubscribed, bump);
    participant.on(ParticipantEvent.TrackPublished, bump);
    participant.on(ParticipantEvent.TrackUnsubscribed, bump);
    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, bump);
      participant.off(ParticipantEvent.TrackPublished, bump);
      participant.off(ParticipantEvent.TrackUnsubscribed, bump);
    };
  }, [participant]);

  const publication = participant.getTrackPublication(Track.Source.Camera);
  const videoTrack = publication?.track;

  useEffect(() => {
    if (!videoEl || !videoTrack || videoTrack.kind !== Track.Kind.Video) return;
    videoTrack.attach(videoEl);
    void videoEl.play().catch(() => {});
    return () => {
      videoTrack.detach(videoEl);
    };
  }, [videoTrack, videoEl]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-zinc-900 min-h-[120px]">
      {videoTrack ? (
        <video
          ref={setVideoEl}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover min-h-[120px]"
        />
      ) : (
        <div className="min-h-[120px] flex items-center justify-center text-zinc-500 text-xs px-2 text-center">
          {name} connected — waiting for their camera…
        </div>
      )}
      <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">
        {name}
      </span>
    </div>
  );
}

function RoomPresencePanel({ mode }: { mode: "collab" | "sandbox" }) {
  const participants = useParticipants();
  const total = participants.length;
  const remote = participants.filter((p) => !p.isLocal);

  if (mode === "sandbox") {
    return (
      <p className="text-xs text-amber-300/90 px-2 pb-1">
        Sandbox is <strong>solo</strong> — you cannot see your partner here. Scroll to{" "}
        <strong>Step 4</strong> and both tap Join collab studio.
      </p>
    );
  }

  return (
    <div className="px-2 pb-1 text-xs">
      <p className={remote.length > 0 ? "text-[#53fc18]" : "text-amber-300/90"}>
        {total} DJ{total === 1 ? "" : "s"} in this room
        {remote.length === 0
          ? " — waiting for your partner on Step 4…"
          : ` — connected: ${remote.map((p) => p.name || p.identity).join(", ")}`}
      </p>
    </div>
  );
}

function StudioVideoLayout({ localPreviewTrack }: { localPreviewTrack: LocalTrack | null }) {
  const participants = useParticipants();
  const remoteParticipants = participants.filter(
    (p): p is import("livekit-client").RemoteParticipant => !p.isLocal,
  );

  return (
    <div className="space-y-2">
      <LocalPreviewVideo track={localPreviewTrack} />
      {remoteParticipants.map((p) => (
        <RemoteParticipantVideo
          key={p.identity}
          participant={p}
          name={p.name || p.identity}
        />
      ))}
    </div>
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

function StudioConnectionStatus({ notice }: { notice?: string }) {
  const room = useRoomContext();
  const [state, setState] = useState<ConnectionState | undefined>(room?.state);

  useEffect(() => {
    if (!room) return;
    const sync = () => setState(room.state);
    sync();
    room.on(RoomEvent.ConnectionStateChanged, sync);
    room.on(RoomEvent.Reconnecting, sync);
    room.on(RoomEvent.Reconnected, sync);
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, sync);
      room.off(RoomEvent.Reconnecting, sync);
      room.off(RoomEvent.Reconnected, sync);
    };
  }, [room]);

  if (notice) {
    return <p className="text-xs text-amber-400/90 px-2 pb-1">{notice}</p>;
  }

  if (!state || state === ConnectionState.Connected) return null;

  const label =
    state === ConnectionState.Connecting
      ? "Connecting to studio…"
      : state === ConnectionState.Reconnecting
        ? "Reconnecting — keep this tab open…"
        : state === ConnectionState.Disconnected
          ? "Disconnected — tap Join again if this does not recover"
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
  hostUsername?: string;
  role?: "host" | "partner";
  compositorActive?: boolean;
  hostStreamLive?: boolean;
  localPreviewTrack: LocalTrack | null;
  connectionNotice?: string;
};

function StudioRoom({
  mode,
  collabId,
  room,
  hostUsername,
  role,
  compositorActive,
  hostStreamLive,
  localPreviewTrack,
  connectionNotice,
}: StudioRoomProps) {
  return (
    <RoomContext.Provider value={room}>
      <RoomPresencePanel mode={mode} />
      <div className="p-2">
        <StudioVideoLayout localPreviewTrack={localPreviewTrack} />
      </div>
      <StudioConnectionStatus notice={connectionNotice} />
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
            Camera + LiveKit OK. Scroll to Step 3–4 to invite your partner and join the{" "}
            <strong>same</strong> collab room.
          </p>
        </div>
      )}
    </RoomContext.Provider>
  );
}

export function CollabWebRtcStudio({
  mode = "collab",
  collabId,
  hostUsername,
  role = "host",
  compositorActive,
  hostStreamLive,
  onPhaseChange,
}: StudioProps) {
  const [phase, setPhase] = useState<JoinPhase>("idle");
  const [joinStep, setJoinStep] = useState<JoinStep>("camera");
  const [tokenPayload, setTokenPayload] = useState<TokenPayload | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [localTracks, setLocalTracks] = useState<LocalTrack[]>([]);
  const [error, setError] = useState("");
  const [connectionNotice, setConnectionNotice] = useState("");
  const studioInstanceIdRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`,
  );
  const tracksRef = useRef<LocalTrack[]>([]);
  const roomRef = useRef<Room | null>(null);
  const intentionalDisconnectRef = useRef(false);
  const sessionRef = useRef<{ url: string; token: string } | null>(null);
  const phaseRef = useRef<JoinPhase>("idle");

  const setPhaseSafe = useCallback(
    (next: JoinPhase) => {
      phaseRef.current = next;
      setPhase(next);
      onPhaseChange?.(next);
    },
    [onPhaseChange],
  );

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
      intentionalDisconnectRef.current = true;
      void r.disconnect(true);
    }
  }, []);

  const reportError = useCallback(
    (msg: string) => {
      setError(msg);
      setConnectionNotice("");
      setPhaseSafe("idle");
      setTokenPayload(null);
      sessionRef.current = null;
      teardownRoom();
      stopTracks();
    },
    [stopTracks, teardownRoom, setPhaseSafe],
  );

  const bindRoomEvents = useCallback(
    (activeRoom: Room) => {
      activeRoom.on(RoomEvent.Reconnecting, () => {
        if (roomRef.current !== activeRoom) return;
        setConnectionNotice("Connection dropped — reconnecting (keep Safari open)…");
        setError("");
      });

      activeRoom.on(RoomEvent.Reconnected, () => {
        if (roomRef.current !== activeRoom) return;
        setConnectionNotice("");
        subscribeRemoteParticipants(activeRoom);
      });

      activeRoom.on(RoomEvent.Disconnected, () => {
        if (roomRef.current !== activeRoom || intentionalDisconnectRef.current) {
          intentionalDisconnectRef.current = false;
          return;
        }
        if (phaseRef.current !== "live") return;
        setConnectionNotice("Studio disconnected — tap Join again if video does not return.");
      });

      activeRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        if (participant.isLocal) return;
        participant.trackPublications.forEach((pub) => {
          pub.setSubscribed(true);
        });
      });
    },
    [],
  );

  useEffect(() => {
    return () => {
      intentionalDisconnectRef.current = true;
      stopTracks();
      const r = roomRef.current;
      if (r) void r.disconnect(true);
    };
  }, [stopTracks]);

  async function joinStudio() {
    setPhaseSafe("joining");
    setJoinStep("camera");
    setError("");
    setConnectionNotice("");
    stopTracks();
    teardownRoom();
    intentionalDisconnectRef.current = false;

    let activeRoom: Room | null = null;
    const timeoutMs = joinTimeoutMs();

    try {
      const tracks = await withTimeout(acquireLocalTracks(), timeoutMs, "Camera/mic");

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

      sessionRef.current = { url: data.url, token: data.token };

      setJoinStep("connect");
      activeRoom = new Room(roomOptionsForDevice());
      roomRef.current = activeRoom;
      bindRoomEvents(activeRoom);

      await withTimeout(
        activeRoom.connect(data.url, data.token, { autoSubscribe: true }),
        timeoutMs,
        "LiveKit connect",
      );
      await waitForRoomConnected(activeRoom, timeoutMs);
      subscribeRemoteParticipants(activeRoom);

      try {
        await activeRoom.startAudio();
      } catch {
        /* iOS may require extra tap for audio — video still works */
      }

      setJoinStep("publish");
      for (const track of tracks) {
        await activeRoom.localParticipant.publishTrack(track, {
          source: track.kind === Track.Kind.Video ? Track.Source.Camera : Track.Source.Microphone,
        });
      }

      if (!localCameraLive(activeRoom)) {
        const pub = activeRoom.localParticipant.getTrackPublication(Track.Source.Camera);
        if (!pub?.track) {
          throw new Error("Camera published but not live — tap Join again.");
        }
      }

      setJoinStep("done");
      setTokenPayload(data as TokenPayload);
      setRoom(activeRoom);
      setPhaseSafe("live");
    } catch (err) {
      stopTracks();
      if (activeRoom) {
        intentionalDisconnectRef.current = true;
        void activeRoom.disconnect(true);
        if (roomRef.current === activeRoom) roomRef.current = null;
      }
      sessionRef.current = null;
      setRoom(null);
      setTokenPayload(null);
      setPhaseSafe("idle");
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
          <div className="space-y-3">
            {localPreviewTrack && (
              <div className="rounded-lg overflow-hidden border border-[#53fc18]/30">
                <LocalPreviewVideo track={localPreviewTrack} />
                <p className="text-[10px] text-center text-[#53fc18] py-1 bg-black/40">Camera OK — connecting…</p>
              </div>
            )}
            <div className="rounded-lg bg-black/40 p-3 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#53fc18] mx-auto mb-2" />
              <p className="text-xs text-amber-200">{joinStepLabel(joinStep)}</p>
            </div>
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
        hostUsername={hostUsername}
        role={role}
        compositorActive={compositorActive}
        hostStreamLive={hostStreamLive}
        localPreviewTrack={localPreviewTrack}
        connectionNotice={connectionNotice}
      />
      {error && <p className="text-xs text-red-400 px-3 pb-3">{error}</p>}
    </div>
  );
}
