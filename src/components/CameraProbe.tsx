"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";

/** Raw getUserMedia test — no LiveKit. Isolates browser camera permissions. */
export function CameraProbe() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "live" | "error">("idle");
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const el = videoRef.current;
    if (el) el.srcObject = null;
    setStatus("idle");
  }, []);

  useEffect(() => () => stop(), [stop]);

  async function start() {
    setStatus("loading");
    setError("");
    stop();

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setStatus("error");
      setError("Camera requires HTTPS — open https://livebooth.uk (not http).");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("This browser does not support camera access. Use Safari or Chrome.");
      return;
    }

    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isMobile ? { facingMode: "user" } : true,
      });
      streamRef.current = stream;
      const el = videoRef.current;
      if (!el) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error("Video element missing — reload the page.");
      }
      el.srcObject = stream;
      await el.play();
      setStatus("live");
    } catch (err) {
      setStatus("error");
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Camera blocked — tap Allow when the browser asks, or enable in Settings → Safari → Camera.");
      } else if (err instanceof DOMException && err.name === "NotReadableError") {
        setError("Camera in use — close FaceTime, Zoom, or other apps using the camera.");
      } else {
        setError(err instanceof Error ? err.message : "Could not open camera");
      }
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-3">
      <p className="text-xs text-zinc-400">
        Step 2a — raw browser camera (no LiveKit). If this fails, fix permissions before testing the studio.
      </p>
      <div className="rounded-lg overflow-hidden bg-zinc-900 aspect-video max-h-64 relative">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover min-h-[180px] ${status === "live" ? "" : "opacity-0 absolute inset-0"}`}
          style={{ transform: "scaleX(-1)" }}
        />
        {status !== "live" && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">
            {status === "loading" ? (
              <Loader2 className="h-6 w-6 animate-spin text-[#53fc18]" />
            ) : (
              "Camera preview appears here"
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={start}
          disabled={status === "loading"}
          className="btn-primary flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {status === "live" ? "Restart camera test" : "Test browser camera"}
        </button>
        {status === "live" && (
          <button
            type="button"
            onClick={stop}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-400"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
