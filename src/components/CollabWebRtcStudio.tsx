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

function isConnectionError(err: unknown): boolean {
  const msg =
    err instanceof Error ? err.message : typeof err === "string" ? err : String(err ?? "");
  return /connect|signal|websocket|room disconnected|negotiation|ice|pc connection|timeout/i.test(
    msg,
  );
}

async function enableCameraWithFallback(room: Room) {
  try {
    await room.localParticipant.setCameraEnabled(true);
  } catch (first) {
    if (first instanceof DOMException && first.name === "OverconstrainedError") {
      await room.localParticipant.setCameraEnabled(true, { facingMode: "user" });
      return;
    }
    throw first;
  }
}

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
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: false },
  );
  if (tracks.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-zinc-900 text-zinc-500 text-xs"
        style={{ minHeight: 240 }}
      >
        Camera preview appears here once enabled
      </div>
    );
  }
  return (
    <GridLayout tracks={tracks} style={{ minHeight: 240 }}>
      <ParticipantTile />
    </GridLayout>
  );
}

function StudioControls({
  onError,
  onClearError,
}: {
  onError: (msg: string) => void;
  onClearError: () => void;
}) {
  const room = useRoomContext();
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraDropped, setCameraDropped] = useState(false);
  const togglingRef = useRef(false);
  const unpublishGraceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraIntentRef = useRef(false);
  const reenableBusyRef = useRef(false);

  useEffect(() => {
    if (!room) return;

    const sync = () => {
      if (unpublishGraceRef.current) return;
      const on = room.localParticipant.isCameraEnabled;
      setCameraOn(on);
      setMicOn(room.localParticipant.isMicrophoneEnabled);
      if (on) {
        setCameraStarting(false);
        setCameraDropped(false);
      }
    };

    const onUnpublished = () => {
      if (!cameraIntentRef.current) {
        sync();
        return;
      }
      if (room.localParticipant.isCameraEnabled) {
        sync();
        return;
      }
      if (unpublishGraceRef.current) clearTimeout(unpublishGraceRef.current);
      unpublishGraceRef.current = setTimeout(() => {
        unpublishGraceRef.current = null;
        if (room.localParticipant.isCameraEnabled) {
          sync();
          return;
        }
        setCameraOn(false);
        setCameraStarting(false);
        setCameraDropped(true);
      }, 4000);
    };

    const reenableAfterReconnect = async () => {
      if (!cameraIntentRef.current || reenableBusyRef.current) return;
      if (room.state !== ConnectionState.Connected) return;
      if (room.localParticipant.isCameraEnabled) return;
      reenableBusyRef.current = true;
      setCameraStarting(true);
      setCameraDropped(false);
      try {
        await enableCameraWithFallback(room);
        if (cameraIntentRef.current) {
          await room.localParticipant.setMicrophoneEnabled(true);
        }
      } catch (err) {
        onError(formatMediaError(err));
      } finally {
        reenableBusyRef.current = false;
        setCameraStarting(false);
        setCameraOn(room.localParticipant.isCameraEnabled);
        setMicOn(room.localParticipant.isMicrophoneEnabled);
      }
    };

    const onReconnecting = () => setCameraStarting(true);

    sync();
    room.on(RoomEvent.LocalTrackPublished, sync);
    room.on(RoomEvent.LocalTrackUnpublished, onUnpublished);
    room.on(RoomEvent.Reconnecting, onReconnecting);
    room.on(RoomEvent.Reconnected, reenableAfterReconnect);

    return () => {
      room.off(RoomEvent.LocalTrackPublished, sync);
      room.off(RoomEvent.LocalTrackUnpublished, onUnpublished);
      room.off(RoomEvent.Reconnecting, onReconnecting);
      room.off(RoomEvent.Reconnected, reenableAfterReconnect);
      if (unpublishGraceRef.current) clearTimeout(unpublishGraceRef.current);
    };
  }, [room, onError]);

  const enableMedia = useCallback(async () => {
    if (!room || togglingRef.current) return;
    togglingRef.current = true;
    setBusy(true);
    onClearError();
    try {
      if (room.state !== ConnectionState.Connected) {
        throw new Error("Still connecting — wait a moment and try again.");
      }
      setCameraStarting(true);
      cameraIntentRef.current = true;
      setCameraDropped(false);
      await enableCameraWithFallback(room);
      await room.localParticipant.setMicrophoneEnabled(true);
      if (unpublishGraceRef.current) {
        clearTimeout(unpublishGraceRef.current);
        unpublishGraceRef.current = null;
      }
      setCameraOn(room.localParticipant.isCameraEnabled);
      setMicOn(room.localParticipant.isMicrophoneEnabled);
      setCameraStarting(false);
    } catch (err) {
      setCameraStarting(false);
      onError(formatMediaError(err));
    } finally {
      setBusy(false);
      togglingRef.current = false;
    }
  }, [room, onClearError, onError]);

  const toggleCamera = useCallback(async () => {
    if (!room || togglingRef.current || busy) return;
    togglingRef.current = true;
    onClearError();
    try {
      const next = !room.localParticipant.isCameraEnabled;
      if (next) {
        setCameraStarting(true);
        cameraIntentRef.current = true;
        setCameraDropped(false);
        await enableCameraWithFallback(room);
        setCameraStarting(false);
      } else {
        cameraIntentRef.current = false;
        setCameraDropped(false);
        await room.localParticipant.setCameraEnabled(false);
      }
      if (unpublishGraceRef.current) {
        clearTimeout(unpublishGraceRef.current);
        unpublishGraceRef.current = null;
      }
      setCameraOn(room.localParticipant.isCameraEnabled);
    } catch (err) {
      setCameraStarting(false);
      onError(formatMediaError(err));
    } finally {
      togglingRef.current = false;
    }
  }, [room, busy, onClearError, onError]);

  const toggleMic = useCallback(async () => {
    if (!room || togglingRef.current || busy) return;
    togglingRef.current = true;
    onClearError();
    try {
      const next = !room.localParticipant.isMicrophoneEnabled;
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicOn(room.localParticipant.isMicrophoneEnabled);
    } catch (err) {
      onError(formatMediaError(err));
    } finally {
      togglingRef.current = false;
    }
  }, [room, busy, onClearError, onError]);

  if (!cameraOn && !cameraStarting && !cameraIntentRef.current) {
    return (
      <div className="px-2 pb-2 space-y-2">
        <button
          type="button"
          onClick={enableMedia}
          disabled={busy}
          className="w-full rounded-xl border border-[#53fc18]/40 bg-[#53fc18]/10 px-4 py-3 text-sm font-medium text-[#53fc18] hover:bg-[#53fc18]/15 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          Turn on camera &amp; mic
        </button>
        <p className="text-[10px] text-zinc-500 text-center">
          Both DJs must join this studio on /collab with camera on (OBS alone does not count).
        </p>
      </div>
    );
  }

  if (cameraStarting) {
    return (
      <div className="px-2 pb-2 space-y-2">
        <p className="text-xs text-amber-400/90 text-center py-2 flex items-center justify-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Starting camera… allow access if prompted
        </p>
        {cameraDropped && (
          <p className="text-[10px] text-zinc-500 text-center">
            Reconnecting studio — camera will resume automatically.
          </p>
        )}
      </div>
    );
  }

  if (cameraDropped && !cameraOn) {
    return (
      <div className="px-2 pb-2 space-y-2">
        <p className="text-xs text-amber-400/90 text-center">
          Camera dropped — tap below to turn it back on.
        </p>
        <button
          type="button"
          onClick={enableMedia}
          disabled={busy}
          className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200"
        >
          Retry camera
        </button>
      </div>
    );
  }

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
      ? "Connecting to rtc.livebooth.uk…"
      : state === ConnectionState.Reconnecting
        ? "Reconnecting…"
        : state === ConnectionState.Disconnected
          ? "Disconnected — check Wi‑Fi and reload /collab"
          : `Connection: ${state}`;

  return <p className="text-xs text-amber-400/90 px-2 pb-1">{label}</p>;
}

function EgressWatcher({
  collabId,
  compositorActive,
  hostUsername,
  hostStreamLive,
}: {
  collabId: string;
  compositorActive?: boolean;
  hostUsername: string;
  hostStreamLive?: boolean;
}) {
  const room = useRoomContext();
  const [status, setStatus] = useState("");
  const [mixActive, setMixActive] = useState(Boolean(compositorActive));
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
        participantCount?: number;
        connectedDjs?: number;
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
        egressBusyRef.current = false;
        return;
      }

      const djs = data.connectedDjs ?? data.participantCount ?? 0;
      const cameras = data.videoPublishers ?? 0;
      const hostOk = data.hostInStudio ?? djs >= 1;
      const partnerOk = data.partnerInStudio ?? djs >= 2;

      if (!data.egressHealthy) {
        setStatus("Egress service restarting on VPS — fan mix may take a minute.");
      } else if (!hostOk) {
        setStatus("Host: open WebRTC studio here and tap Turn on camera & mic.");
      } else if (!partnerOk) {
        setStatus(
          "Partner: must open /collab on their phone, Open WebRTC studio, and turn camera on (OBS does not count).",
        );
      } else if (cameras < 2) {
        setStatus(
          `${cameras}/2 cameras on — both DJs tap Turn on camera & mic and keep this tab open.`,
        );
      } else if (data.canStartEgress) {
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
            setStatus(
              body.egress.reason === "activated_pending_hls"
                ? "Fan mix started — HLS may take a few seconds on the booth page."
                : "Fan stream is live on the host booth.",
            );
          } else {
            setStatus(`Mix failed (${body.egress?.reason ?? "retry"}) — check VPS egress logs.`);
          }
        } else {
          setStatus("Could not start fan mix — try again in a few seconds.");
        }
      } else {
        setStatus(`${djs}/2 DJs connected · ${cameras}/2 cameras on — waiting to start mix…`);
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
        <p className="text-amber-400/90 font-medium">
          {status || "Studio connected — waiting for both DJs with cameras on…"}
        </p>
      )}
      {mixActive && status && <p className="text-zinc-500">{status}</p>}
      {!hostStreamLive && (
        <p className="text-amber-400/90">
          Host must publish from Go Live before fans can watch the booth page.
        </p>
      )}
      {hostStreamLive ? (
        <Link href={`/stream/${hostUsername}`} className="text-[#53fc18] hover:underline inline-block">
          Open fan booth →
        </Link>
      ) : (
        <span className="text-zinc-600 inline-block">Open fan booth (publish first)</span>
      )}
    </div>
  );
}

type StudioRoomProps = {
  collabId: string;
  token: string;
  serverUrl: string;
  hostUsername: string;
  compositorActive?: boolean;
  hostStreamLive?: boolean;
  onError: (msg: string) => void;
};

function StudioRoom({
  collabId,
  token,
  serverUrl,
  hostUsername,
  compositorActive,
  hostStreamLive,
  onError,
}: StudioRoomProps) {
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const reportError = useCallback((msg: string) => {
    onErrorRef.current(msg);
  }, []);

  const clearError = useCallback(() => {
    onErrorRef.current("");
  }, []);

  const handleRoomError = useCallback((e: Error) => {
    if (isConnectionError(e)) return;
    onErrorRef.current(formatMediaError(e));
  }, []);

  const handleMediaDeviceFailure = useCallback((failure?: unknown) => {
    if (isConnectionError(failure)) return;
    onErrorRef.current(formatMediaError(failure));
  }, []);

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      video={false}
      audio={false}
      options={ROOM_OPTIONS}
      data-lk-theme="default"
      onError={handleRoomError}
      onMediaDeviceFailure={handleMediaDeviceFailure}
    >
      <div className="p-2">
        <StudioVideoGrid />
      </div>
      <StudioConnectionStatus />
      <StudioControls onError={reportError} onClearError={clearError} />
      <RoomAudioRenderer />
      <div className="px-2 pb-2">
        <EgressWatcher
          collabId={collabId}
          compositorActive={compositorActive}
          hostUsername={hostUsername}
          hostStreamLive={hostStreamLive}
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
  const [tokenPayload, setTokenPayload] = useState<TokenPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const studioInstanceIdRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`,
  );

  const reportError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  async function connect() {
    setLoading(true);
    setError("");
    const res = await apiFetch("/api/livekit/token", {
      method: "POST",
      body: JSON.stringify({ collabId, studioInstanceId: studioInstanceIdRef.current }),
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
        key={collabId}
        collabId={collabId}
        token={tokenPayload.token}
        serverUrl={tokenPayload.url}
        hostUsername={hostUsername}
        compositorActive={compositorActive}
        hostStreamLive={hostStreamLive}
        onError={reportError}
      />
      {error && <p className="text-xs text-red-400 px-3 pb-3">{error}</p>}
    </div>
  );
}
