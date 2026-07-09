/** In-memory ring buffer for LiveKit collab studio debugging. */

export type StudioLogLevel = "info" | "warn" | "error";

export type StudioLogEntry = {
  ts: number;
  level: StudioLogLevel;
  tag: string;
  message: string;
};

export type StudioDiagSnapshot = {
  roomState: string;
  localCamPublished: boolean;
  localCamHealthy: boolean;
  localStreamId: string | null;
  serverCam: boolean | null;
  remoteCount: number;
  reconnects: number;
  unpublishes: number;
  attaches: number;
  serverCamFlips: number;
};

const MAX_LOG = 60;

let entries: StudioLogEntry[] = [];
let snapshot: StudioDiagSnapshot = {
  roomState: "—",
  localCamPublished: false,
  localCamHealthy: false,
  localStreamId: null,
  serverCam: null,
  remoteCount: 0,
  reconnects: 0,
  unpublishes: 0,
  attaches: 0,
  serverCamFlips: 0,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function notify(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function push(level: StudioLogLevel, tag: string, message: string) {
  const entry: StudioLogEntry = { ts: Date.now(), level, tag, message };
  entries = [...entries.slice(-(MAX_LOG - 1)), entry];
  if (typeof console !== "undefined") {
    const line = `[CollabStudio][${tag}] ${message}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.info(line);
  }
  emit();
}

export const studioDiag = {
  log: (tag: string, message: string) => push("info", tag, message),
  warn: (tag: string, message: string) => push("warn", tag, message),
  error: (tag: string, message: string) => push("error", tag, message),

  getEntries: () => entries,
  getSnapshot: () => snapshot,

  patchSnapshot(patch: Partial<StudioDiagSnapshot>) {
    const prevServerCam = snapshot.serverCam;
    snapshot = { ...snapshot, ...patch };
    if (
      patch.serverCam !== undefined &&
      prevServerCam !== null &&
      patch.serverCam !== prevServerCam
    ) {
      snapshot = { ...snapshot, serverCamFlips: snapshot.serverCamFlips + 1 };
      push(
        "warn",
        "server",
        `server cam ${prevServerCam ? "yes" : "no"} → ${patch.serverCam ? "yes" : "no"}`,
      );
    }
    emit();
  },

  bump(field: "reconnects" | "unpublishes" | "attaches") {
    snapshot = { ...snapshot, [field]: snapshot[field] + 1 };
    emit();
  },

  subscribe: notify,

  reset() {
    entries = [];
    snapshot = {
      roomState: "—",
      localCamPublished: false,
      localCamHealthy: false,
      localStreamId: null,
      serverCam: null,
      remoteCount: 0,
      reconnects: 0,
      unpublishes: 0,
      attaches: 0,
      serverCamFlips: 0,
    };
    emit();
  },

  formatEntries(): string {
    return entries
      .map((e) => {
        const t = new Date(e.ts).toISOString().slice(11, 23);
        return `${t} [${e.level}] ${e.tag}: ${e.message}`;
      })
      .join("\n");
  },

  diagnose(): string {
    const s = snapshot;
    if (s.serverCamFlips >= 3) {
      return "Server keeps losing camera — likely VPS firewall (DO: UDP 50000-50100, 3478, TCP 5349) or unstable ICE.";
    }
    if (s.unpublishes >= 3) {
      return "Local camera unpublishing repeatedly — network reconnect loop; check firewall / stay on Wi‑Fi.";
    }
    if (s.localCamHealthy && s.serverCam === false) {
      return "Browser has camera but server does not — media UDP blocked or publish never reached SFU.";
    }
    if (s.reconnects >= 2) {
      return "Frequent reconnects — check rtc.livebooth.uk WebSocket and TURN (turn.livebooth.uk:5349).";
    }
    if (s.attaches >= 8) {
      return "Video re-attaching often — UI track switching; check log for attach/unpublish pairs.";
    }
    return "Monitoring — copy log if flicker continues.";
  },
};
