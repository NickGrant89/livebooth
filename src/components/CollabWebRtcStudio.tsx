"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  PreJoin,
  RoomAudioRenderer,
  useConnectionState,
  useRoomContext,
  useTracks,
  type LocalUserChoices,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  Track,
  RoomEvent,
  ConnectionState,
  VideoPresets,
  type Room,
  type RoomOptions,
  type VideoCaptureOptions,
  type AudioCaptureOptions,
} from "livekit-client";
import { Loader2, Radio, Wifi } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/fetch-client";
import { studioDiag } from "@/lib/collab-studio-diagnostics";
import { CollabStudioDiagnosticsPanel } from "@/components/CollabStudioDiagnostics";

type StudioProps = {
  mode?: "collab" | "sandbox";
  collabId?: string;
  hostUsername?: string;
  role?: "host" | "partner";
  compositorActive?: boolean;
  hostStreamLive?: boolean;
  onPhaseChange?: (phase: "idle" | "joining" | "live") => void;
};

type TokenPayload = {
  token: string;
  url: string;
  room: string;
  identity?: string;
};

type StudioGate = "idle" | "prejoin" | "live";

const STUDIO_POLL_MS = 15_000;
const JOIN_TIMEOUT_MS = 30_000;
const JOIN_TIMEOUT_MOBILE_MS = 60_000;

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function joinTimeoutMs(): number {
  return isMobileDevice() ? JOIN_TIMEOUT_MOBILE_MS : JOIN_TIMEOUT_MS;
}

function roomOptionsForDevice(): RoomOptions {
  return {
    disconnectOnPageLeave: false,
    adaptiveStream: true,
    dynacast: true,
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

function connectOptionsForDevice() {
  const forceRelay =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("relay") === "1";

  return {
    autoSubscribe: true,
    peerConnectionTimeout: joinTimeoutMs(),
    maxRetries: 5,
    websocketTimeout: 20_000,
    rtcConfig: forceRelay ? { iceTransportPolicy: "relay" as RTCIceTransportPolicy } : undefined,
  };
}

function formatMediaError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Camera/mic blocked — tap Allow when the browser asks.";
    }
    if (err.name === "NotReadableError") {
      return "Camera in use — close other apps, then try again.";
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

function captureFromChoices(choices: LocalUserChoices): {
  video: VideoCaptureOptions | boolean;
  audio: AudioCaptureOptions | boolean;
} {
  const mobile = isMobileDevice();
  const resolution = mobile ? VideoPresets.h360.resolution : VideoPresets.h540.resolution;

  const video: VideoCaptureOptions | boolean = choices.videoEnabled
    ? {
        deviceId: choices.videoDeviceId || undefined,
        resolution,
        ...(mobile && !choices.videoDeviceId ? { facingMode: "user" as const } : {}),
      }
    : false;

  const audio: AudioCaptureOptions | boolean = choices.audioEnabled
    ? { deviceId: choices.audioDeviceId || undefined }
    : false;

  return { video, audio };
}

function syncDiagFromRoom(room: Room) {
  const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
  const track = pub?.track;
  studioDiag.patchSnapshot({
    roomState: room.state,
    localCamPublished: Boolean(pub?.track ?? pub?.trackSid),
    localCamHealthy: Boolean(track?.mediaStreamTrack?.readyState === "live"),
    localStreamId: track?.mediaStreamTrack?.id?.slice(0, 8) ?? null,
    remoteCount: room.remoteParticipants.size,
  });
}

function StudioRoomDiagnosticsWatcher() {
  const room = useRoomContext();

  useEffect(() => {
    studioDiag.log("room", "diagnostics started (LiveKitRoom)");

    const onConn = () => {
      syncDiagFromRoom(room);
      studioDiag.log("room", `connection ${room.state}`);
    };

    const onReconnecting = () => {
      studioDiag.bump("reconnects");
      studioDiag.warn("room", "reconnecting");
      syncDiagFromRoom(room);
    };

    const onReconnected = () => {
      studioDiag.log("room", "reconnected");
      syncDiagFromRoom(room);
    };

    const onDisconnected = (reason?: unknown) => {
      studioDiag.warn("room", `disconnected ${String(reason ?? "")}`);
      syncDiagFromRoom(room);
    };

    const onLocalPublished = (pub: { source?: Track.Source }) => {
      studioDiag.log("local", `published ${pub.source ?? "track"}`);
      syncDiagFromRoom(room);
    };

    const onLocalUnpublished = (pub: { source?: Track.Source }) => {
      studioDiag.bump("unpublishes");
      studioDiag.warn("local", `unpublished ${pub.source ?? "track"}`);
      syncDiagFromRoom(room);
    };

    const onParticipantChange = () => syncDiagFromRoom(room);

    onConn();
    room.on(RoomEvent.ConnectionStateChanged, onConn);
    room.on(RoomEvent.Reconnecting, onReconnecting);
    room.on(RoomEvent.Reconnected, onReconnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.LocalTrackPublished, onLocalPublished);
    room.on(RoomEvent.LocalTrackUnpublished, onLocalUnpublished);
    room.on(RoomEvent.ParticipantConnected, onParticipantChange);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantChange);

    const tick = setInterval(() => syncDiagFromRoom(room), 3000);
    return () => {
      clearInterval(tick);
      room.off(RoomEvent.ConnectionStateChanged, onConn);
      room.off(RoomEvent.Reconnecting, onReconnecting);
      room.off(RoomEvent.Reconnected, onReconnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.LocalTrackPublished, onLocalPublished);
      room.off(RoomEvent.LocalTrackUnpublished, onLocalUnpublished);
      room.off(RoomEvent.ParticipantConnected, onParticipantChange);
      room.off(RoomEvent.ParticipantDisconnected, onParticipantChange);
    };
  }, [room]);

  return null;
}

function StudioVideoGrid() {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  });

  return (
    <div className="p-2 min-h-[240px]">
      <GridLayout tracks={tracks} className="!h-auto min-h-[220px]">
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}

function LocalPublishBadge({
  serverCamOk,
}: {
  serverCamOk?: boolean | null;
}) {
  const room = useRoomContext();
  const [cameraLive, setCameraLive] = useState(false);

  useEffect(() => {
    const sync = () => {
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      setCameraLive(Boolean(pub?.track && pub.track.mediaStreamTrack.readyState === "live"));
    };
    sync();
    room.on(RoomEvent.LocalTrackPublished, sync);
    room.on(RoomEvent.LocalTrackUnpublished, sync);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, sync);
      room.off(RoomEvent.LocalTrackUnpublished, sync);
    };
  }, [room]);

  if (cameraLive && serverCamOk === false) {
    return (
      <p className="text-[10px] text-amber-400/90 px-2">
        Camera on in browser but server sees no-cam — confirm DigitalOcean firewall allows UDP
        50000-50100, 3478, and TCP 5349, then leave and rejoin.
      </p>
    );
  }
  if (cameraLive || serverCamOk === true) {
    return <p className="text-[10px] text-[#53fc18] px-2">Your camera is live to the room</p>;
  }
  return (
    <p className="text-[10px] text-amber-400/90 px-2">
      Turning on camera… use the Camera button below if this stays more than a few seconds.
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
      studioDiag.patchSnapshot({ serverCam: me ? Boolean(me.hasVideo) : null });
      if (studioIdentity && onServerCamLive && !reportedServerCamRef.current && me?.hasVideo) {
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

function StudioConnectionNotice({ notice }: { notice?: string }) {
  const state = useConnectionState();
  if (notice) return <p className="text-xs text-amber-400/90 px-2 pb-1">{notice}</p>;
  if (state === ConnectionState.Reconnecting) {
    return <p className="text-xs text-amber-400/90 px-2 pb-1">Reconnecting…</p>;
  }
  if (state === ConnectionState.Connecting) {
    return <p className="text-xs text-amber-400/90 px-2 pb-1">Connecting to studio…</p>;
  }
  return null;
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

function StudioRoomContent({
  mode,
  collabId,
  hostUsername,
  role,
  compositorActive,
  hostStreamLive,
  studioIdentity,
  connectionNotice,
  serverCamOk,
  onServerCamStatus,
}: {
  mode: "collab" | "sandbox";
  collabId?: string;
  hostUsername?: string;
  role?: "host" | "partner";
  compositorActive?: boolean;
  hostStreamLive?: boolean;
  studioIdentity?: string;
  connectionNotice?: string;
  serverCamOk?: boolean | null;
  onServerCamStatus?: (hasVideo: boolean) => void;
}) {
  const state = useConnectionState();

  return (
    <>
      <StudioRoomDiagnosticsWatcher />
      <CollabStudioDiagnosticsPanel />
      <StudioConnectionNotice notice={connectionNotice} />
      {state === ConnectionState.Connected && (
        <>
          <RoomPresencePanel
            mode={mode}
            collabId={collabId}
            studioIdentity={studioIdentity}
            onServerCamStatus={onServerCamStatus}
          />
          <LocalPublishBadge serverCamOk={serverCamOk} />
        </>
      )}
      <StudioVideoGrid />
      <ControlBar controls={{ chat: false, settings: false, leave: false }} />
      <RoomAudioRenderer />
      {mode === "collab" && collabId && hostUsername && role && state === ConnectionState.Connected && (
        <div className="px-2 pb-2">
          <EgressWatcher
            collabId={collabId}
            compositorActive={compositorActive}
            hostUsername={hostUsername}
            hostStreamLive={hostStreamLive}
            role={role}
          />
        </div>
      )}
    </>
  );
}

type StudioSession = TokenPayload;

export function CollabWebRtcStudio({
  mode = "collab",
  collabId,
  hostUsername,
  role = "host",
  compositorActive,
  hostStreamLive,
  onPhaseChange,
}: StudioProps) {
  const [gate, setGate] = useState<StudioGate>("idle");
  const [session, setSession] = useState<StudioSession | null>(null);
  const [userChoices, setUserChoices] = useState<LocalUserChoices | null>(null);
  const [error, setError] = useState("");
  const [connectionNotice, setConnectionNotice] = useState("");
  const [serverCamOk, setServerCamOk] = useState<boolean | null>(null);
  const [fetching, setFetching] = useState(false);

  const studioInstanceIdRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`,
  );

  const roomOptions = useMemo(() => roomOptionsForDevice(), []);
  const connectOptions = useMemo(() => connectOptionsForDevice(), []);

  const setGateSafe = useCallback(
    (next: StudioGate) => {
      setGate(next);
      onPhaseChange?.(next === "live" ? "live" : next === "prejoin" ? "joining" : "idle");
    },
    [onPhaseChange],
  );

  const leaveStudio = useCallback(() => {
    setSession(null);
    setUserChoices(null);
    setServerCamOk(null);
    setConnectionNotice("");
    setError("");
    setGateSafe("idle");
    studioDiag.reset();
  }, [setGateSafe]);

  const handleServerCamStatus = useCallback((hasVideo: boolean) => {
    setServerCamOk(hasVideo);
  }, []);

  async function prepareStudio() {
    if (fetching) return;
    setFetching(true);
    setError("");
    setConnectionNotice("");
    setServerCamOk(null);
    studioDiag.reset();
    studioDiag.log("join", "fetching token");

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

      setSession(data);
      setGateSafe("prejoin");
      studioDiag.log("join", `token ok room=${data.room}`);
    } catch (err) {
      setError(formatMediaError(err));
      setGateSafe("idle");
    } finally {
      setFetching(false);
    }
  }

  function handlePreJoinSubmit(choices: LocalUserChoices) {
    studioDiag.log("prejoin", `video=${choices.videoEnabled} audio=${choices.audioEnabled}`);
    setUserChoices(choices);
    setGateSafe("live");
  }

  const capture = userChoices ? captureFromChoices(userChoices) : { video: true, audio: true };

  if (gate === "idle") {
    return (
      <div className="rounded-xl border border-[#53fc18]/30 bg-[#53fc18]/5 p-4 space-y-3">
        <p className="text-sm font-medium text-[#53fc18] flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          {mode === "sandbox" ? "Camera + LiveKit test" : `${role === "host" ? "Host" : "Partner"} collab studio`}
        </p>
        <p className="text-xs text-zinc-400">
          {mode === "collab"
            ? "Step 4 — tap Join, pick camera + mic, then Allow when Safari asks."
            : "Solo test — tap Join. Use Step 4 to connect with your partner."}
        </p>
        {error && <p className="text-xs text-red-400 break-words">{error}</p>}
        <button
          type="button"
          onClick={() => void prepareStudio()}
          disabled={fetching}
          className="btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
          {fetching ? "Preparing…" : mode === "sandbox" ? "Test my camera" : "Join collab studio (camera + mic)"}
        </button>
      </div>
    );
  }

  if (gate === "prejoin" && session) {
    return (
      <div className="rounded-xl border border-[#53fc18]/30 overflow-hidden bg-zinc-950">
        <div className="p-3 border-b border-white/10">
          <p className="text-xs text-zinc-400">Check camera & mic, then tap Join studio.</p>
        </div>
        <div className="lk-prejoin [&_.lk-button]:rounded-lg">
          <PreJoin
            joinLabel="Join studio"
            micLabel="Microphone"
            camLabel="Camera"
            defaults={{
              videoEnabled: true,
              audioEnabled: true,
              username: role === "host" ? "Host" : "Partner",
            }}
            onError={(err) => {
              studioDiag.error("prejoin", formatMediaError(err));
              setError(formatMediaError(err));
            }}
            onSubmit={handlePreJoinSubmit}
          />
        </div>
        {error && <p className="text-xs text-red-400 px-3 pb-3 break-words">{error}</p>}
        <div className="px-3 pb-3">
          <button type="button" onClick={leaveStudio} className="text-xs text-zinc-500 hover:text-red-400">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!session || !userChoices) return null;

  return (
    <div className="rounded-xl border border-[#53fc18]/30 overflow-hidden bg-black">
      <LiveKitRoom
        serverUrl={session.url}
        token={session.token}
        connect
        video={capture.video}
        audio={capture.audio}
        options={roomOptions}
        connectOptions={connectOptions}
        data-lk-theme="default"
        onConnected={() => {
          studioDiag.log("room", "connected");
          setConnectionNotice("");
          setError("");
        }}
        onDisconnected={() => {
          setConnectionNotice("Connection dropped — leave and rejoin if video stays frozen.");
        }}
        onError={(err) => {
          studioDiag.error("room", err.message);
          setConnectionNotice(formatMediaError(err));
        }}
        onMediaDeviceFailure={() => {
          setConnectionNotice("Camera/mic failed — use Camera/Mic buttons below or leave and rejoin.");
        }}
      >
        <StudioRoomContent
          mode={mode}
          collabId={collabId}
          hostUsername={hostUsername}
          role={role}
          compositorActive={compositorActive}
          hostStreamLive={hostStreamLive}
          studioIdentity={session.identity}
          connectionNotice={connectionNotice || error || undefined}
          serverCamOk={serverCamOk}
          onServerCamStatus={handleServerCamStatus}
        />
        <div className="px-3 pb-3 flex justify-end">
          <button type="button" onClick={leaveStudio} className="text-xs text-zinc-500 hover:text-red-400">
            Leave studio
          </button>
        </div>
      </LiveKitRoom>
    </div>
  );
}
