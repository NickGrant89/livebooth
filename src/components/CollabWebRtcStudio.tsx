"use client";

import { useCallback, useEffect, useMemo, useRef, useState, createContext, useContext, memo } from "react";
import {
  RoomContext,
  RoomAudioRenderer,
  useConnectionState,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  Track,
  RoomEvent,
  ConnectionState,
  ParticipantEvent,
  VideoPresets,
  Room,
  createLocalTracks,
  type LocalTrack,
  type RemoteParticipant,
  type RemoteTrackPublication,
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
  identity?: string;
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
    // Default true — stops camera on unpublish during ICE reconnect, then server flips cam/no-cam.
    stopLocalTrackOnUnpublish: false,
    videoCaptureDefaults: {
      resolution: isMobileDevice() ? VideoPresets.h360.resolution : VideoPresets.h540.resolution,
    },
    publishDefaults: {
      simulcast: false,
      videoCodec: "h264",
      red: false,
    },
  };
}

function joinTimeoutMs(): number {
  return isMobileDevice() ? JOIN_TIMEOUT_MOBILE_MS : JOIN_TIMEOUT_MS;
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

function videoCaptureForPublish(): VideoCaptureOptions | undefined {
  return isMobileDevice() ? { facingMode: "user" } : undefined;
}

async function acquireLocalTracks(): Promise<LocalTrack[]> {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    throw new Error("Camera requires HTTPS — use https://livebooth.uk");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera not supported — use Safari or Chrome.");
  }

  try {
    return await createLocalTracks({
      audio: true,
      video: isMobileDevice() ? { facingMode: "user" } : true,
    });
  } catch (first) {
    if (isMobileDevice()) {
      return createLocalTracks({ audio: true, video: true });
    }
    throw first;
  }
}

function stopLocalTracks(tracks: LocalTrack[]) {
  for (const track of tracks) {
    track.stop();
  }
}

function subscribeRemotePublication(pub: RemoteTrackPublication) {
  if (!pub.isSubscribed) {
    void pub.setSubscribed(true);
  }
}

function subscribeRemoteParticipants(room: Room) {
  for (const participant of room.remoteParticipants.values()) {
    for (const pub of participant.trackPublications.values()) {
      subscribeRemotePublication(pub);
    }
  }
}

function cameraDeviceOptions(videoTrack: LocalTrack | undefined): VideoCaptureOptions | undefined {
  const deviceId = videoTrack?.mediaStreamTrack.getSettings().deviceId;
  if (deviceId) return { deviceId };
  return videoCaptureForPublish();
}

function localCameraIsPublished(room: Room): boolean {
  const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
  return Boolean(pub?.track ?? pub?.trackSid);
}

function localCameraTrackHealthy(room: Room): boolean {
  const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
  return Boolean(track?.mediaStreamTrack && track.mediaStreamTrack.readyState === "live");
}

async function verifyServerSeesCamera(collabId: string, identity: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const res = await apiFetch(`/api/livekit/room-status?collabId=${encodeURIComponent(collabId)}`);
  if (!res.ok) return false;
  const data = (await res.json()) as {
    participants?: { identity?: string; hasVideo?: boolean; tracks?: number }[];
  };
  const me = data.participants?.find((p) => p.identity === identity);
  return Boolean(me?.hasVideo);
}

/** Publish camera/mic via LiveKit native API — survives reconnect on mobile Safari. */
async function ensureLocalMediaPublished(
  room: Room,
  videoCapture?: VideoCaptureOptions,
) {
  if (localCameraTrackHealthy(room)) {
    try {
      await room.startAudio();
    } catch {
      /* iOS may need extra tap */
    }
    return;
  }

  const capture = videoCapture ?? videoCaptureForPublish();
  await room.localParticipant.setCameraEnabled(true, capture);
  if (!room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track) {
    await room.localParticipant.setMicrophoneEnabled(true);
  }

  try {
    await room.startAudio();
  } catch {
    /* iOS may need extra tap */
  }

  if (!localCameraIsPublished(room)) {
    throw new Error(
      "Camera not published — tap Camera below. If it keeps failing, check DigitalOcean firewall allows UDP 50000-50100, 3478, TCP 5349.",
    );
  }
}

function LocalPreviewVideo({ track }: { track: LocalTrack | null }) {
  return <StableAttachedVideo track={track} mirror minHeight={200} className="w-full h-full object-cover rounded-lg bg-zinc-900" />;
}

/** One persistent <video> — attach only when MediaStreamTrack id changes; never swap to a placeholder. */
function StableAttachedVideo({
  track,
  mirror,
  className,
  minHeight = 200,
}: {
  track: Track | null;
  mirror?: boolean;
  className?: string;
  minHeight?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const boundTrackRef = useRef<Track | null>(null);
  const boundStreamIdRef = useRef<string | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !track || track.kind !== Track.Kind.Video) return;

    const streamId = track.mediaStreamTrack.id;
    if (boundStreamIdRef.current === streamId) return;

    if (boundTrackRef.current) {
      boundTrackRef.current.detach(el);
    }

    track.attach(el);
    void el.play().catch(() => {});
    boundTrackRef.current = track;
    boundStreamIdRef.current = streamId;
  }, [track?.mediaStreamTrack?.id]);

  useEffect(() => {
    const el = videoRef.current;
    return () => {
      if (el && boundTrackRef.current) {
        boundTrackRef.current.detach(el);
        boundTrackRef.current = null;
        boundStreamIdRef.current = null;
      }
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className={className}
      style={{
        minHeight,
        transform: mirror ? "scaleX(-1)" : undefined,
        backgroundColor: "#18181b",
      }}
    />
  );
}

/** Local feed — preview track while live, fall back to room publication after recovery. */
function LocalCameraTile() {
  const room = useRoomContext();
  const previewTracks = usePreviewTracks();
  const [displayTrack, setDisplayTrack] = useState<LocalTrack | Track | null>(null);
  const streamIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!room) return;

    const pick = (): LocalTrack | Track | null => {
      const preview = previewTracks.find(
        (t) => t.kind === Track.Kind.Video && t.mediaStreamTrack.readyState !== "ended",
      );
      if (preview) return preview;
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
      return pub?.kind === Track.Kind.Video ? pub : null;
    };

    const sync = () => {
      const next = pick();
      if (!next) return;
      const id = next.mediaStreamTrack.id;
      if (streamIdRef.current === id) return;
      streamIdRef.current = id;
      setDisplayTrack(next);
    };

    sync();
    room.on(RoomEvent.LocalTrackPublished, sync);
    room.on(RoomEvent.Reconnected, sync);

    return () => {
      room.off(RoomEvent.LocalTrackPublished, sync);
      room.off(RoomEvent.Reconnected, sync);
    };
  }, [room, previewTracks]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-zinc-900" style={{ minHeight: 200 }}>
      <StableAttachedVideo
        track={displayTrack}
        mirror
        className="w-full h-full object-cover min-h-[200px]"
        minHeight={200}
      />
      {!displayTrack && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-xs pointer-events-none">
          Camera loading…
        </div>
      )}
    </div>
  );
}

const RemoteParticipantCamera = memo(function RemoteParticipantCamera({
  participant,
  name,
}: {
  participant: RemoteParticipant;
  name: string;
}) {
  const [track, setTrack] = useState<Track | null>(null);
  const streamIdRef = useRef<string | null>(null);

  useEffect(() => {
    const subscribe = () => {
      const pub = participant.getTrackPublication(Track.Source.Camera);
      if (pub && !pub.isSubscribed) void pub.setSubscribed(true);
    };

    const sync = () => {
      subscribe();
      const t = participant.getTrackPublication(Track.Source.Camera)?.track;
      if (!t || t.kind !== Track.Kind.Video) return;
      const id = t.mediaStreamTrack.id;
      if (streamIdRef.current === id) return;
      streamIdRef.current = id;
      setTrack(t);
    };

    subscribe();
    sync();
    participant.on(ParticipantEvent.TrackPublished, sync);
    participant.on(ParticipantEvent.TrackSubscribed, sync);

    return () => {
      participant.off(ParticipantEvent.TrackPublished, sync);
      participant.off(ParticipantEvent.TrackSubscribed, sync);
    };
  }, [participant]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-zinc-900 min-h-[120px]">
      <StableAttachedVideo
        track={track}
        className="w-full h-full object-cover min-h-[120px]"
        minHeight={120}
      />
      {!track && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-xs px-2 text-center pointer-events-none">
          {name} in room — connecting video…
        </div>
      )}
      <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">
        {name}
      </span>
    </div>
  );
});

const StudioVideoLayout = memo(function StudioVideoLayout() {
  const room = useRoomContext();
  const [remoteIds, setRemoteIds] = useState<string[]>([]);

  useEffect(() => {
    if (!room) return;
    const sync = () => setRemoteIds(Array.from(room.remoteParticipants.keys()));
    sync();
    room.on(RoomEvent.ParticipantConnected, sync);
    room.on(RoomEvent.ParticipantDisconnected, sync);
    return () => {
      room.off(RoomEvent.ParticipantConnected, sync);
      room.off(RoomEvent.ParticipantDisconnected, sync);
    };
  }, [room]);

  return (
    <div className="space-y-2">
      <LocalCameraTile />
      {remoteIds.map((id) => {
        const participant = room.remoteParticipants.get(id);
        if (!participant) return null;
        return (
          <RemoteParticipantCamera
            key={id}
            participant={participant}
            name={participant.name || participant.identity}
          />
        );
      })}
    </div>
  );
});

const PreviewTracksContext = createContext<LocalTrack[]>([]);

function usePreviewTracks() {
  return useContext(PreviewTracksContext);
}

const STUDIO_POLL_MS = 15_000;

/** Publish on connect / reconnect only — no republish on every unpublish blip. */
function PublishAcquiredTracks({
  sessionKey,
  videoCapture,
  onError,
  onPublished,
}: {
  sessionKey: number;
  videoCapture?: VideoCaptureOptions;
  onError: (msg: string) => void;
  onPublished?: () => void;
}) {
  const room = useRoomContext();
  const onErrorRef = useRef(onError);
  const onPublishedRef = useRef(onPublished);
  const publishBusyRef = useRef(false);
  const videoCaptureRef = useRef(videoCapture);
  videoCaptureRef.current = videoCapture;
  const lastReconnectPublishRef = useRef(0);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    onPublishedRef.current = onPublished;
  }, [onPublished]);

  useEffect(() => {
    const markLive = () => {
      onPublishedRef.current?.();
      onErrorRef.current("");
    };

    const syncLive = () => {
      if (localCameraTrackHealthy(room)) {
        markLive();
        return true;
      }
      return false;
    };

    const runPublish = async () => {
      if (publishBusyRef.current || localCameraTrackHealthy(room)) {
        syncLive();
        return;
      }
      publishBusyRef.current = true;
      try {
        await ensureLocalMediaPublished(room, videoCaptureRef.current);
        syncLive();
      } catch (err) {
        onErrorRef.current(formatMediaError(err));
      } finally {
        publishBusyRef.current = false;
      }
    };

    const onLocalPublished = () => {
      syncLive();
    };
    const onConnected = () => {
      void runPublish();
    };
    const onReconnected = () => {
      const now = Date.now();
      if (now - lastReconnectPublishRef.current < 30_000) return;
      lastReconnectPublishRef.current = now;
      void runPublish();
    };

    room.on(RoomEvent.LocalTrackPublished, onLocalPublished);
    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.Reconnected, onReconnected);

    if (room.state === ConnectionState.Connected && !syncLive()) {
      void runPublish();
    }

    return () => {
      room.off(RoomEvent.LocalTrackPublished, onLocalPublished);
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.Reconnected, onReconnected);
    };
  }, [sessionKey, room]);

  return null;
}

function LocalPublishBadge({
  publishError,
  serverCamOk,
  publishComplete,
}: {
  publishError?: string;
  serverCamOk?: boolean | null;
  publishComplete?: boolean;
}) {
  const room = useRoomContext();
  const [cameraLive, setCameraLive] = useState(false);

  useEffect(() => {
    if (!room) return;
    const sync = () => {
      setCameraLive(localCameraIsPublished(room));
    };
    sync();
    room.on(RoomEvent.LocalTrackPublished, sync);
    room.on(RoomEvent.LocalTrackUnpublished, sync);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, sync);
      room.off(RoomEvent.LocalTrackUnpublished, sync);
    };
  }, [room]);

  const isLive = publishComplete || cameraLive || serverCamOk === true;

  if (publishError && !isLive) {
    return <p className="text-[10px] text-red-400 px-2 break-words">{publishError}</p>;
  }
  if (isLive && serverCamOk === false) {
    return (
      <p className="text-[10px] text-amber-400/90 px-2">
        Camera on in browser but server sees no-cam — confirm DigitalOcean firewall allows UDP
        50000-50100, 3478, and TCP 5349, then tap Reconnect studio.
      </p>
    );
  }
  if (isLive) {
    return <p className="text-[10px] text-[#53fc18] px-2">Your camera is live to the room</p>;
  }
  return (
    <p className="text-[10px] text-amber-400/90 px-2">
      Publishing camera to room… tap Camera below if this stays more than a few seconds.
    </p>
  );
}

function RoomPresencePanel({
  mode,
  collabId,
  studioIdentity,
  onServerCamLive,
  onServerCamStatus,
}: {
  mode: "collab" | "sandbox";
  collabId?: string;
  studioIdentity?: string;
  onServerCamLive?: () => void;
  onServerCamStatus?: (hasVideo: boolean) => void;
}) {
  const room = useRoomContext();
  const [browserCount, setBrowserCount] = useState(1);
  const [remoteNames, setRemoteNames] = useState<string[]>([]);
  const [serverCount, setServerCount] = useState<number | null>(null);
  const [serverParticipants, setServerParticipants] = useState<
    { identity?: string; name?: string; hasVideo?: boolean; tracks?: number }[]
  >([]);
  const [copied, setCopied] = useState(false);
  const reportedServerCamRef = useRef(false);

  useEffect(() => {
    reportedServerCamRef.current = false;
  }, [collabId, studioIdentity]);

  const roomLabel = collabId ? `collab-${collabId}` : room.name;

  useEffect(() => {
    if (!room) return;
    const sync = () => {
      const remotes = Array.from(room.remoteParticipants.values());
      setBrowserCount(1 + remotes.length);
      setRemoteNames(remotes.map((p) => p.name || p.identity));
    };
    sync();
    room.on(RoomEvent.ParticipantConnected, sync);
    room.on(RoomEvent.ParticipantDisconnected, sync);
    return () => {
      room.off(RoomEvent.ParticipantConnected, sync);
      room.off(RoomEvent.ParticipantDisconnected, sync);
    };
  }, [room]);

  useEffect(() => {
    if (mode !== "collab" || !collabId) return;
    let cancelled = false;
    async function poll() {
      const res = await apiFetch(`/api/livekit/room-status?collabId=${encodeURIComponent(collabId!)}`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as {
        participantCount?: number;
        participants?: { identity?: string; name?: string; hasVideo?: boolean; tracks?: number }[];
      };
      setServerCount(data.participantCount ?? null);
      setServerParticipants(data.participants ?? []);
      const me = studioIdentity
        ? data.participants?.find((p) => p.identity === studioIdentity)
        : undefined;
      if (me && onServerCamStatus) {
        onServerCamStatus(Boolean(me.hasVideo));
      }
      if (
        studioIdentity &&
        onServerCamLive &&
        !reportedServerCamRef.current &&
        me?.hasVideo
      ) {
        reportedServerCamRef.current = true;
        onServerCamLive();
      }
    }
    poll();
    const t = setInterval(poll, STUDIO_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [mode, collabId, studioIdentity, onServerCamLive, onServerCamStatus]);

  if (mode === "sandbox") {
    return (
      <p className="text-xs text-amber-300/90 px-2 pb-1">
        Sandbox = solo test. To see your partner, both use <strong>Step 4 Join together</strong>.
      </p>
    );
  }

  return (
    <div className="px-2 pb-1 text-xs space-y-0.5">
      <p className={remoteNames.length > 0 ? "text-[#53fc18]" : "text-amber-300/90"}>
        {browserCount} DJ{browserCount === 1 ? "" : "s"} in this room (browser)
        {remoteNames.length === 0
          ? " — waiting for partner on Step 4…"
          : ` · ${remoteNames.join(", ")}`}
      </p>
      {serverCount != null && (
        <p className="text-zinc-600 font-mono text-[10px]">
          server sees {serverCount} participant{serverCount === 1 ? "" : "s"} · room {roomLabel} ·{" "}
          {room.state}
          {serverParticipants.length > 0 && (
            <>
              {" "}
              ·{" "}
              {serverParticipants
                .map((p) => `${p.name ?? "?"}:${p.hasVideo ? "cam" : "no-cam"}(${p.tracks ?? 0}t)`)
                .join(" · ")}
            </>
          )}
        </p>
      )}
      {mode === "collab" && collabId && (
        <p className="text-zinc-500 text-[10px]">
          Both DJs must match this room:{" "}
          <button
            type="button"
            className="text-[#53fc18] hover:underline font-mono"
            onClick={() => {
              void navigator.clipboard.writeText(collabId);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {collabId.slice(0, 8)}…{copied ? " copied" : " (copy id)"}
          </button>
          {remoteNames.length === 0 && browserCount === 1 && (
            <span className="text-amber-400/90"> · partner on wrong page or old invite?</span>
          )}
        </p>
      )}
    </div>
  );
}

function StudioControls() {
  const room = useRoomContext();
  const previewTracks = usePreviewTracks();
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  useEffect(() => {
    if (!room) return;
    const sync = () => {
      const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      setMicOn(Boolean(micPub?.track && !micPub.isMuted));
      setCameraOn(Boolean(camPub?.track && !camPub.isMuted));
    };
    sync();
    room.on(RoomEvent.LocalTrackPublished, sync);
    room.on(RoomEvent.LocalTrackUnpublished, sync);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, sync);
      room.off(RoomEvent.LocalTrackUnpublished, sync);
    };
  }, [room]);

  const micPreview = previewTracks.find((t) => t.kind === Track.Kind.Audio);
  const camPreview = previewTracks.find((t) => t.kind === Track.Kind.Video);
  const micLive = micOn || Boolean(micPreview);
  const camLive = cameraOn || Boolean(camPreview);

  return (
    <div className="px-2 pb-2 flex gap-2">
      <button
        type="button"
        onClick={() =>
          void room.localParticipant.setMicrophoneEnabled(!micLive).then(() => setMicOn(!micLive))
        }
        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs flex items-center justify-center gap-2"
      >
        {micLive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-400" />}
        Mic
      </button>
      <button
        type="button"
        onClick={() => {
          const camPreview = previewTracks.find((t) => t.kind === Track.Kind.Video);
          void room.localParticipant
            .setCameraEnabled(!camLive, cameraDeviceOptions(camPreview))
            .then(() => setCameraOn(!camLive));
        }}
        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs flex items-center justify-center gap-2"
      >
        {camLive ? <Camera className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-red-400" />}
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
  onPublishError,
}: {
  collabId: string;
  compositorActive?: boolean;
  hostUsername: string;
  hostStreamLive?: boolean;
  role: "host" | "partner";
  onPublishError?: (msg: string) => void;
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

      if (!room.localParticipant.getTrackPublication(Track.Source.Camera)?.track) {
        setStatus("Publishing camera — allow access if prompted, or tap Camera below.");
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
    const interval = setInterval(tick, STUDIO_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [room, collabId, role, onPublishError]);

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

/** Subscribe to all remote tracks — LiveKitRoom autoSubscribe can miss late joiners. */
function RemoteTrackSubscriber() {
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    const subscribeAll = () => subscribeRemoteParticipants(room);
    const onParticipant = (participant: RemoteParticipant) => {
      if (participant.isLocal) return;
      participant.trackPublications.forEach((pub) => subscribeRemotePublication(pub));
    };
    const onTrackPublished = (
      publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (participant.isLocal) return;
      subscribeRemotePublication(publication);
    };

    subscribeAll();
    room.on(RoomEvent.Connected, subscribeAll);
    room.on(RoomEvent.ParticipantConnected, onParticipant);
    room.on(RoomEvent.TrackPublished, onTrackPublished);
    room.on(RoomEvent.Reconnected, subscribeAll);

    return () => {
      room.off(RoomEvent.Connected, subscribeAll);
      room.off(RoomEvent.ParticipantConnected, onParticipant);
      room.off(RoomEvent.TrackPublished, onTrackPublished);
      room.off(RoomEvent.Reconnected, subscribeAll);
    };
  }, [room]);

  return null;
}

function StudioConnectingOverlay({ label }: { label: string }) {
  const state = useConnectionState();
  // Only block UI on first connect — reconnects keep video visible (overlay was causing flicker).
  if (state !== ConnectionState.Connecting) return null;

  return (
    <div className="rounded-lg bg-black/40 p-3 text-center mx-2 mt-2">
      <Loader2 className="h-6 w-6 animate-spin text-[#53fc18] mx-auto mb-2" />
      <p className="text-xs text-amber-200">{label}</p>
    </div>
  );
}

const CollabVideoStage = memo(function CollabVideoStage() {
  return (
    <div className="p-2">
      <StudioVideoLayout />
    </div>
  );
});

function StudioRoom({
  mode,
  collabId,
  hostUsername,
  role,
  compositorActive,
  hostStreamLive,
  connectionNotice,
  connectingLabel,
  onPublishError,
  publishComplete,
  publishError,
  serverCamOk,
  onPublished,
  sessionKey,
  studioIdentity,
  onServerCamStatus,
  videoCapture,
}: {
  mode: "collab" | "sandbox";
  collabId?: string;
  hostUsername?: string;
  role?: "host" | "partner";
  compositorActive?: boolean;
  hostStreamLive?: boolean;
  connectionNotice?: string;
  connectingLabel: string;
  onPublishError: (msg: string) => void;
  publishComplete?: boolean;
  publishError?: string;
  serverCamOk?: boolean | null;
  onPublished?: () => void;
  sessionKey: number;
  studioIdentity?: string;
  onServerCamStatus?: (hasVideo: boolean) => void;
  videoCapture?: VideoCaptureOptions;
}) {
  const state = useConnectionState();
  const previewTracks = usePreviewTracks();
  const showVideo = state === ConnectionState.Connected || previewTracks.length > 0;

  return (
    <>
      <RemoteTrackSubscriber />
      <PublishAcquiredTracks
        sessionKey={sessionKey}
        videoCapture={videoCapture}
        onError={onPublishError}
        onPublished={onPublished}
      />
      <StudioConnectingOverlay label={connectingLabel} />
      {showVideo && (
        <>
          {state === ConnectionState.Connected && (
            <RoomPresencePanel
              mode={mode}
              collabId={collabId}
              studioIdentity={studioIdentity}
              onServerCamLive={onPublished}
              onServerCamStatus={onServerCamStatus}
            />
          )}
          {state === ConnectionState.Connected && (
            <LocalPublishBadge
              publishError={publishError}
              serverCamOk={serverCamOk}
              publishComplete={publishComplete}
            />
          )}
          <CollabVideoStage />
          {state === ConnectionState.Connected && (
            <>
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
                    onPublishError={onPublishError}
                  />
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </>
  );
}

type StudioSession = TokenPayload & { sessionKey: number; videoCapture?: VideoCaptureOptions };

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
  const [session, setSession] = useState<StudioSession | null>(null);
  const [previewTracks, setPreviewTracks] = useState<LocalTrack[]>([]);
  const [error, setError] = useState("");
  const [connectionNotice, setConnectionNotice] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [publishComplete, setPublishComplete] = useState(false);
  const [serverCamOk, setServerCamOk] = useState<boolean | null>(null);
  const studioInstanceIdRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`,
  );
  const attemptRef = useRef(0);
  const fetchingRef = useRef(false);
  const connectedRef = useRef(false);
  const previewTracksRef = useRef<LocalTrack[]>([]);

  const roomOptions = useMemo(() => roomOptionsForDevice(), []);
  const studioRoom = useMemo(() => new Room(roomOptions), [roomOptions]);
  const connectOptions = useMemo(
    () => ({
      autoSubscribe: true,
      peerConnectionTimeout: joinTimeoutMs(),
      maxRetries: 5,
      websocketTimeout: 20_000,
    }),
    [],
  );

  const setPhaseSafe = useCallback(
    (next: JoinPhase) => {
      setPhase(next);
      onPhaseChange?.(next);
    },
    [onPhaseChange],
  );

  const endSession = useCallback(() => {
    attemptRef.current += 1;
    connectedRef.current = false;
    stopLocalTracks(previewTracksRef.current);
    previewTracksRef.current = [];
    setPreviewTracks([]);
    setPublishComplete(false);
    setServerCamOk(null);
    setSession(null);
    setPhaseSafe("idle");
    setConnectionNotice("");
    setMediaError("");
    void studioRoom.disconnect(true).catch(() => {});
  }, [setPhaseSafe, studioRoom]);

  const checkServerCamera = useCallback(
    async (identity: string | undefined) => {
      if (mode !== "collab" || !collabId || !identity) return;
      const ok = await verifyServerSeesCamera(collabId, identity);
      setServerCamOk(ok);
    },
    [mode, collabId],
  );

  const handlePublishError = useCallback((msg: string) => {
    if (!msg) {
      setMediaError("");
      return;
    }
    setMediaError(msg);
  }, []);

  const sessionIdentityRef = useRef<string | undefined>(undefined);
  sessionIdentityRef.current = session?.identity;

  const handlePublished = useCallback(() => {
    setPublishComplete(true);
    setMediaError("");
    void checkServerCamera(sessionIdentityRef.current);
  }, [checkServerCamera]);

  const handleServerCamStatus = useCallback((hasVideo: boolean) => {
    setServerCamOk(hasVideo);
  }, []);

  useEffect(() => {
    if (!session) return;

    const onDisconnected = () => {
      if (connectedRef.current) {
        setConnectionNotice("Connection dropped — keep this tab open or tap Reconnect.");
      }
    };
    const onMediaDevicesError = () => {
      setMediaError("Camera/mic failed — tap Reconnect and Allow when prompted.");
    };

    studioRoom.on(RoomEvent.Disconnected, onDisconnected);
    studioRoom.on(RoomEvent.MediaDevicesError, onMediaDevicesError);
    return () => {
      studioRoom.off(RoomEvent.Disconnected, onDisconnected);
      studioRoom.off(RoomEvent.MediaDevicesError, onMediaDevicesError);
    };
  }, [session, studioRoom]);

  async function joinStudio() {
    if (fetchingRef.current) return;

    const attempt = ++attemptRef.current;
    fetchingRef.current = true;
    connectedRef.current = false;
    setPhaseSafe("joining");
    setJoinStep("login");
    setError("");
    setConnectionNotice("");
    setMediaError("");
    setPublishComplete(false);
    setServerCamOk(null);
    stopLocalTracks(previewTracksRef.current);
    previewTracksRef.current = [];
    setPreviewTracks([]);
    setSession(null);

    let acquiredTracks: LocalTrack[] = [];

    try {
      // Camera/mic must be requested on the Join click — before any other await.
      setJoinStep("camera");
      acquiredTracks = await acquireLocalTracks();
      if (attempt !== attemptRef.current) {
        stopLocalTracks(acquiredTracks);
        return;
      }
      previewTracksRef.current = acquiredTracks;
      setPreviewTracks(acquiredTracks);

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
      if (attempt !== attemptRef.current) return;

      setJoinStep("connect");
      if (studioRoom.state !== ConnectionState.Disconnected) {
        await studioRoom.disconnect(true);
      }
      await withTimeout(
        studioRoom.connect(data.url, data.token, connectOptions),
        joinTimeoutMs(),
        "Studio link",
      );
      if (attempt !== attemptRef.current) {
        await studioRoom.disconnect(true);
        return;
      }

      const videoCapture = cameraDeviceOptions(
        acquiredTracks.find((t) => t.kind === Track.Kind.Video),
      );
      stopLocalTracks(acquiredTracks);
      previewTracksRef.current = [];
      setPreviewTracks([]);

      setJoinStep("camera");
      await ensureLocalMediaPublished(studioRoom, videoCapture);

      connectedRef.current = true;
      setJoinStep("done");
      setPhaseSafe("live");
      setPublishComplete(true);
      setSession({ ...data, sessionKey: Date.now(), videoCapture });
      void checkServerCamera(data.identity);
    } catch (err) {
      if (attempt !== attemptRef.current) return;
      stopLocalTracks(acquiredTracks);
      previewTracksRef.current = [];
      setPreviewTracks([]);
      setPublishComplete(false);
      setServerCamOk(null);
      void studioRoom.disconnect(true).catch(() => {});
      setPhaseSafe("idle");
      setError(formatMediaError(err));
    } finally {
      fetchingRef.current = false;
    }
  }

  if (!session) {
    return (
      <div className="rounded-xl border border-[#53fc18]/30 bg-[#53fc18]/5 p-4 space-y-3">
        <p className="text-sm font-medium text-[#53fc18] flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          {mode === "sandbox" ? "Camera + LiveKit test" : `${role === "host" ? "Host" : "Partner"} collab studio`}
        </p>
        <p className="text-xs text-zinc-400">
          {mode === "collab"
            ? "Step 4 — tap Join and choose Allow for camera + mic when prompted."
            : "Solo test — tap Join and Allow camera/mic. Use Step 4 to connect with your partner."}
        </p>
        {phase === "joining" && previewTracks.length > 0 && (
          <div className="rounded-lg overflow-hidden border border-[#53fc18]/30">
            <LocalPreviewVideo
              track={previewTracks.find((t) => t.kind === Track.Kind.Video) ?? null}
            />
            <p className="text-[10px] text-center text-[#53fc18] py-1 bg-black/40">Camera OK — connecting…</p>
          </div>
        )}
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
      <PreviewTracksContext.Provider value={previewTracks}>
        <RoomContext.Provider value={studioRoom}>
          <StudioRoom
            mode={mode}
            collabId={collabId}
            hostUsername={hostUsername}
            role={role}
            compositorActive={compositorActive}
            hostStreamLive={hostStreamLive}
            connectionNotice={connectionNotice || mediaError || undefined}
            connectingLabel={joinStepLabel(joinStep === "login" ? "connect" : joinStep)}
            onPublishError={handlePublishError}
            publishComplete={publishComplete}
            publishError={mediaError || undefined}
            serverCamOk={serverCamOk}
            onPublished={handlePublished}
            sessionKey={session.sessionKey}
            studioIdentity={session.identity}
            onServerCamStatus={handleServerCamStatus}
            videoCapture={session.videoCapture}
          />
          <StudioFooter
            onReconnect={joinStudio}
            onLeave={() => {
              endSession();
              setError("");
            }}
          />
        </RoomContext.Provider>
      </PreviewTracksContext.Provider>
    </div>
  );
}

function StudioFooter({ onReconnect, onLeave }: { onReconnect: () => void; onLeave: () => void }) {
  const state = useConnectionState();

  return (
    <div className="px-3 pb-3 flex items-center justify-between gap-3">
      {state === ConnectionState.Disconnected && (
        <button type="button" onClick={onReconnect} className="text-xs text-[#53fc18] hover:underline">
          Reconnect studio
        </button>
      )}
      <button
        type="button"
        onClick={onLeave}
        className="text-xs text-zinc-500 hover:text-red-400 ml-auto"
      >
        Leave studio
      </button>
    </div>
  );
}
