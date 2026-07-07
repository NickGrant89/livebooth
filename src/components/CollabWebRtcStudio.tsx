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

type JoinStep = "login" | "connect" | "camera" | "done";

const JOIN_TIMEOUT_MS = 30_000;
const JOIN_TIMEOUT_MOBILE_MS = 60_000;

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function roomOptionsForDevice(): RoomOptions {
  return {
    disconnectOnPageLeave: false,
    adaptiveStream: false,
    dynacast: false,
    videoCaptureDefaults: {
      resolution: isMobileDevice() ? VideoPresets.h360.resolution : VideoPresets.h540.resolution,
    },
    publishDefaults: {
      simulcast: false,
    },
  };
}

function joinTimeoutMs(): number {
  return isMobileDevice() ? JOIN_TIMEOUT_MOBILE_MS : JOIN_TIMEOUT_MS;
}

function videoCaptureOptions(): VideoCaptureOptions | undefined {
  return isMobileDevice() ? { facingMode: "user" } : undefined;
}

function formatMediaError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Camera/mic blocked — tap Allow when the browser asks.";
    }
    if (err.name === "NotReadableError") {
      return "Camera in use — close other apps, then tap Join again.";
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
    return `Timed out — ${msg}`;
  }
  if (/PermissionDenied|NotAllowed|permission|denied/i.test(msg)) {
    return "Camera/mic blocked in browser settings.";
  }
  if (/manager is closed|peerconnection|ice|failed to connect|websocket|pc connection/i.test(msg)) {
    return isMobileDevice()
      ? `Studio link failed on phone — try Wi‑Fi, keep Safari open. (${msg})`
      : `Studio link failed — ${msg}`;
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
    case "login":
      return "Getting studio pass…";
    case "connect":
      return "Connecting to rtc.livebooth.uk…";
    case "camera":
      return "Turning on camera & mic…";
    case "done":
      return "Connected";
  }
}

function subscribeRemoteParticipants(room: Room) {
  for (const participant of room.remoteParticipants.values()) {
    for (const pub of participant.trackPublications.values()) {
      pub.setSubscribed(true);
    }
  }
}

function LocalPreviewVideo({ track }: { track: LocalTrack | null }) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoEl || !track || track.kind !== Track.Kind.Video) return;
    track.attach(videoEl);
    void videoEl.play().catch(() => {});
    return () => {
      track.detach(videoEl);
    };
  }, [track, videoEl]);

  if (!track) {
    return (
      <div
        className="w-full rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500 text-xs"
        style={{ minHeight: 200 }}
      >
        No camera track
      </div>
    );
  }

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

function LocalCameraFromRoom() {
  const room = useRoomContext();
  const [, tick] = useState(0);

  useEffect(() => {
    if (!room) return;
    const bump = () => tick((n) => n + 1);
    room.on(RoomEvent.LocalTrackPublished, bump);
    room.on(RoomEvent.LocalTrackUnpublished, bump);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, bump);
      room.off(RoomEvent.LocalTrackUnpublished, bump);
    };
  }, [room]);

  const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track ?? null;
  return <LocalPreviewVideo track={track as LocalTrack | null} />;
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

  const videoTrack = participant.getTrackPublication(Track.Source.Camera)?.track;

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
          {name} in room — waiting for camera…
        </div>
      )}
      <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">
        {name}
      </span>
    </div>
  );
}

function RoomPresencePanel({ mode, collabId }: { mode: "collab" | "sandbox"; collabId?: string }) {
  const room = useRoomContext();
  const participants = useParticipants();
  const total = participants.length;
  const remote = participants.filter((p) => !p.isLocal);
  const [serverCount, setServerCount] = useState<number | null>(null);

  useEffect(() => {
    if (mode !== "collab" || !collabId) return;
    let cancelled = false;
    async function poll() {
      const res = await apiFetch(`/api/livekit/room-status?collabId=${encodeURIComponent(collabId!)}`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { participantCount?: number };
      setServerCount(data.participantCount ?? null);
    }
    poll();
    const t = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [mode, collabId]);

  if (mode === "sandbox") {
    return (
      <p className="text-xs text-amber-300/90 px-2 pb-1">
        Sandbox = solo test. To see your partner, both use <strong>Step 4 Join together</strong>.
      </p>
    );
  }

  return (
    <div className="px-2 pb-1 text-xs space-y-0.5">
      <p className={remote.length > 0 ? "text-[#53fc18]" : "text-amber-300/90"}>
        {total} DJ{total === 1 ? "" : "s"} in this room (browser)
        {remote.length === 0
          ? " — waiting for partner on Step 4…"
          : ` · ${remote.map((p) => p.name || p.identity).join(", ")}`}
      </p>
      {serverCount != null && (
        <p className="text-zinc-600 font-mono text-[10px]">
          server sees {serverCount} participant{serverCount === 1 ? "" : "s"} · room {room.name} ·{" "}
          {room.state}
        </p>
      )}
    </div>
  );
}

function StudioVideoLayout() {
  const participants = useParticipants();
  const remoteParticipants = participants.filter(
    (p): p is import("livekit-client").RemoteParticipant => !p.isLocal,
  );

  return (
    <div className="space-y-2">
      <LocalCameraFromRoom />
      {remoteParticipants.map((p) => (
        <RemoteParticipantVideo key={p.identity} participant={p} name={p.name || p.identity} />
      ))}
    </div>
  );
}

function StudioControls() {
  const room = useRoomContext();
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

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

  return (
    <div className="px-2 pb-2 flex gap-2">
      <button
        type="button"
        onClick={() => void room.localParticipant.setMicrophoneEnabled(!micOn).then(() => setMicOn(!micOn))}
        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs flex items-center justify-center gap-2"
      >
        {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-400" />}
        Mic
      </button>
      <button
        type="button"
        onClick={() => void room.localParticipant.setCameraEnabled(!cameraOn).then(() => setCameraOn(!cameraOn))}
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
  const [state, setState] = useState(room?.state);

  useEffect(() => {
    if (!room) return;
    const sync = () => setState(room.state);
    sync();
    room.on(RoomEvent.ConnectionStateChanged, sync);
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, sync);
    };
  }, [room]);

  if (notice) return <p className="text-xs text-amber-400/90 px-2 pb-1">{notice}</p>;
  if (!state || state === ConnectionState.Connected) return null;
  return (
    <p className="text-xs text-amber-400/90 px-2 pb-1">
      {state === ConnectionState.Reconnecting ? "Reconnecting…" : `Connection: ${state}`}
    </p>
  );
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
        videoPublishers?: number;
        hostInStudio?: boolean;
        partnerInStudio?: boolean;
        canStartEgress?: boolean;
        compositorActive?: boolean;
        egressHealthy?: boolean;
      };

      setDebug(
        `mix: host=${data.hostInStudio ? "yes" : "no"} partner=${data.partnerInStudio ? "yes" : "no"} cameras=${data.videoPublishers ?? 0}/2`,
      );

      if (data.compositorActive) {
        setMixActive(true);
        setStatus("Fan stream is live on the host booth.");
        return;
      }

      if (!room!.localParticipant.isCameraEnabled) {
        setStatus("Turn camera on with the button below.");
        return;
      }
      if (!data.hostInStudio) {
        setStatus("Waiting for host to join Step 4…");
        return;
      }
      if (!data.partnerInStudio) {
        setStatus("Waiting for partner to join Step 4…");
        return;
      }
      if ((data.videoPublishers ?? 0) < 2) {
        setStatus(`${data.videoPublishers ?? 0}/2 cameras — both need camera on.`);
        return;
      }
      if (!data.egressHealthy) {
        setStatus("Mix server warming up…");
        return;
      }
      if (data.canStartEgress) {
        const now = Date.now();
        if (egressBusyRef.current || now - lastEgressAttemptRef.current < 15_000) {
          setStatus("Starting fan mix…");
          return;
        }
        egressBusyRef.current = true;
        lastEgressAttemptRef.current = now;
        const start = await apiFetch("/api/collab/webrtc", {
          method: "POST",
          body: JSON.stringify({ collabId }),
        });
        egressBusyRef.current = false;
        if (start.ok) {
          const body = (await start.json()) as { egress?: { active?: boolean; reason?: string } };
          if (body.egress?.active) {
            setMixActive(true);
            setStatus("Fan mix live!");
          } else {
            setStatus(`Mix failed: ${body.egress?.reason ?? "retry"}`);
          }
        }
        return;
      }
      setStatus("Waiting to start mix…");
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
        <p className="text-amber-400/90 font-medium">{status || "Connected…"}</p>
      )}
      {debug && !mixActive && <p className="text-zinc-600 font-mono text-[10px]">{debug}</p>}
      {hostStreamLive && (
        <Link href={`/stream/${hostUsername}`} className="text-[#53fc18] hover:underline inline-block">
          Open fan booth →
        </Link>
      )}
    </div>
  );
}

function StudioRoom({
  mode,
  collabId,
  room,
  hostUsername,
  role,
  compositorActive,
  hostStreamLive,
  connectionNotice,
}: {
  mode: "collab" | "sandbox";
  collabId?: string;
  room: Room;
  hostUsername?: string;
  role?: "host" | "partner";
  compositorActive?: boolean;
  hostStreamLive?: boolean;
  connectionNotice?: string;
}) {
  return (
    <RoomContext.Provider value={room}>
      <RoomPresencePanel mode={mode} collabId={collabId} />
      <div className="p-2">
        <StudioVideoLayout />
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
      ) : null}
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
  const [joinStep, setJoinStep] = useState<JoinStep>("login");
  const [tokenPayload, setTokenPayload] = useState<TokenPayload | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");
  const [connectionNotice, setConnectionNotice] = useState("");
  const studioInstanceIdRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`,
  );
  const roomRef = useRef<Room | null>(null);
  const phaseRef = useRef<JoinPhase>("idle");

  const setPhaseSafe = useCallback(
    (next: JoinPhase) => {
      phaseRef.current = next;
      setPhase(next);
      onPhaseChange?.(next);
    },
    [onPhaseChange],
  );

  const leaveRoom = useCallback(() => {
    const r = roomRef.current;
    roomRef.current = null;
    setRoom(null);
    setTokenPayload(null);
    if (r) void r.disconnect(true);
  }, []);

  useEffect(() => {
    return () => {
      const r = roomRef.current;
      if (r) void r.disconnect(true);
    };
  }, []);

  async function joinStudio() {
    if (phaseRef.current === "joining") return;

    setPhaseSafe("joining");
    setJoinStep("login");
    setError("");
    setConnectionNotice("");

    if (roomRef.current) leaveRoom();

    const timeoutMs = joinTimeoutMs();
    let activeRoom: Room | null = null;

    try {
      const tokenEndpoint = mode === "sandbox" ? "/api/livekit/sandbox" : "/api/livekit/token";
      const tokenBody =
        mode === "sandbox"
          ? JSON.stringify({ studioInstanceId: studioInstanceIdRef.current })
          : JSON.stringify({ collabId, studioInstanceId: studioInstanceIdRef.current });

      if (mode === "collab" && !collabId) {
        throw new Error("Complete Step 3 quick setup first.");
      }

      const res = await withTimeout(
        apiFetch(tokenEndpoint, { method: "POST", body: tokenBody }),
        15_000,
        "Studio login",
      );
      const data = (await res.json()) as TokenPayload & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not join studio");

      setJoinStep("connect");
      activeRoom = new Room(roomOptionsForDevice());
      roomRef.current = activeRoom;

      activeRoom.on(RoomEvent.Reconnecting, () => {
        setConnectionNotice("Reconnecting — keep this tab open…");
      });
      activeRoom.on(RoomEvent.Reconnected, () => {
        setConnectionNotice("");
        subscribeRemoteParticipants(activeRoom!);
      });
      activeRoom.on(RoomEvent.Disconnected, () => {
        // Do not tear down — mobile often drops briefly then reconnects.
        setConnectionNotice("Connection dropped — reconnecting… keep this tab open.");
      });
      activeRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        if ("isLocal" in participant && participant.isLocal) return;
        participant.trackPublications.forEach((pub) => pub.setSubscribed(true));
      });

      if (typeof activeRoom.prepareConnection === "function") {
        try {
          await activeRoom.prepareConnection(data.url, data.token);
        } catch {
          /* optional prefetch */
        }
      }

      await withTimeout(
        activeRoom.connect(data.url, data.token, { autoSubscribe: true }),
        timeoutMs,
        "LiveKit connect",
      );

      if (activeRoom.state !== ConnectionState.Connected) {
        throw new Error(`Room not connected (state=${activeRoom.state})`);
      }

      subscribeRemoteParticipants(activeRoom);

      setJoinStep("camera");
      await activeRoom.localParticipant.setCameraEnabled(true, videoCaptureOptions());
      await activeRoom.localParticipant.setMicrophoneEnabled(true);

      const cam = activeRoom.localParticipant.getTrackPublication(Track.Source.Camera);
      if (!cam?.track) {
        throw new Error("Camera did not start — check permissions and tap Join again.");
      }

      try {
        await activeRoom.startAudio();
      } catch {
        /* ok on iOS */
      }

      setJoinStep("done");
      setTokenPayload(data);
      setRoom(activeRoom);
      setPhaseSafe("live");
    } catch (err) {
      if (activeRoom) {
        void activeRoom.disconnect(true);
        if (roomRef.current === activeRoom) roomRef.current = null;
      }
      setRoom(null);
      setTokenPayload(null);
      setPhaseSafe("idle");
      setError(formatMediaError(err));
    }
  }

  if (phase !== "live" || !tokenPayload || !room) {
    return (
      <div className="rounded-xl border border-[#53fc18]/30 bg-[#53fc18]/5 p-4 space-y-3">
        <p className="text-sm font-medium text-[#53fc18] flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          {mode === "sandbox" ? "Camera + LiveKit test" : `${role === "host" ? "Host" : "Partner"} collab studio`}
        </p>
        <p className="text-xs text-zinc-400">
          {mode === "collab"
            ? "Step 4 — joins the shared collab room with your partner (not the solo sandbox above)."
            : "Solo test only — use Step 4 to connect with your partner."}
        </p>
        {phase === "joining" && (
          <div className="rounded-lg bg-black/40 p-3 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#53fc18] mx-auto mb-2" />
            <p className="text-xs text-amber-200">{joinStepLabel(joinStep)}</p>
          </div>
        )}
        {error && <p className="text-xs text-red-400 break-words">{error}</p>}
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
          {phase === "joining" ? "Joining…" : mode === "sandbox" ? "Test my camera" : "Join collab studio (camera + mic)"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#53fc18]/30 overflow-hidden bg-black">
      <StudioRoom
        mode={mode}
        collabId={collabId}
        room={room}
        hostUsername={hostUsername}
        role={role}
        compositorActive={compositorActive}
        hostStreamLive={hostStreamLive}
        connectionNotice={connectionNotice}
      />
      <div className="px-3 pb-3 flex items-center justify-between gap-3">
        {room.state === ConnectionState.Disconnected && (
          <button
            type="button"
            onClick={joinStudio}
            className="text-xs text-[#53fc18] hover:underline"
          >
            Reconnect studio
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            leaveRoom();
            setPhaseSafe("idle");
            setError("");
            setConnectionNotice("");
          }}
          className="text-xs text-zinc-500 hover:text-red-400 ml-auto"
        >
          Leave studio
        </button>
      </div>
    </div>
  );
}
