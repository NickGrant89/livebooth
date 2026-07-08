"use client";

import { useEffect, useState } from "react";
import { studioDiag, type StudioLogEntry } from "@/lib/collab-studio-diagnostics";

function formatTime(ts: number) {
  return new Date(ts).toISOString().slice(11, 23);
}

export function CollabStudioDiagnosticsPanel() {
  const [open, setOpen] = useState(true);
  const [entries, setEntries] = useState<StudioLogEntry[]>([]);
  const [snap, setSnap] = useState(studioDiag.getSnapshot());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return studioDiag.subscribe(() => {
      setEntries([...studioDiag.getEntries()]);
      setSnap({ ...studioDiag.getSnapshot() });
    });
  }, []);

  async function copyLog() {
    const text = [
      "=== LiveBooth collab studio log ===",
      studioDiag.diagnose(),
      "",
      `room=${snap.roomState} localPub=${snap.localCamPublished} localLive=${snap.localCamHealthy} serverCam=${snap.serverCam}`,
      `reconnects=${snap.reconnects} unpublishes=${snap.unpublishes} attaches=${snap.attaches} serverFlips=${snap.serverCamFlips}`,
      "",
      studioDiag.formatEntries(),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-2 mb-2 rounded-lg border border-zinc-700 bg-zinc-950/90 text-[10px] font-mono">
      <button
        type="button"
        className="w-full flex items-center justify-between px-2 py-1.5 text-zinc-400 hover:text-zinc-200"
        onClick={() => setOpen((o) => !o)}
      >
        <span>Studio debug log</span>
        <span>{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-1.5 border-t border-zinc-800">
          <p className="text-amber-300/90 pt-1.5 leading-snug">{studioDiag.diagnose()}</p>
          <p className="text-zinc-500 leading-snug">
            room <span className="text-zinc-300">{snap.roomState}</span>
            {" · "}local{" "}
            <span className={snap.localCamHealthy ? "text-[#53fc18]" : "text-red-400"}>
              {snap.localCamPublished ? (snap.localCamHealthy ? "live" : "dead") : "none"}
            </span>
            {" · "}server{" "}
            <span
              className={
                snap.serverCam === true
                  ? "text-[#53fc18]"
                  : snap.serverCam === false
                    ? "text-red-400"
                    : "text-zinc-500"
              }
            >
              {snap.serverCam === null ? "?" : snap.serverCam ? "cam" : "no-cam"}
            </span>
            {" · "}reconn {snap.reconnects} unpublish {snap.unpublishes} attach {snap.attaches}{" "}
            flip {snap.serverCamFlips}
          </p>
          <div className="max-h-28 overflow-y-auto space-y-0.5 text-zinc-600">
            {entries.length === 0 ? (
              <p className="text-zinc-600">Waiting for events…</p>
            ) : (
              entries
                .slice()
                .reverse()
                .map((e, i) => (
                  <p
                    key={`${e.ts}-${i}`}
                    className={
                      e.level === "error"
                        ? "text-red-400"
                        : e.level === "warn"
                          ? "text-amber-400"
                          : undefined
                    }
                  >
                    {formatTime(e.ts)} {e.tag}: {e.message}
                  </p>
                ))
            )}
          </div>
          <button
            type="button"
            onClick={() => void copyLog()}
            className="text-[#53fc18] hover:underline"
          >
            {copied ? "Copied" : "Copy log for support"}
          </button>
        </div>
      )}
    </div>
  );
}
