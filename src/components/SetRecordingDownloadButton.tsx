"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";

type Variant = "button" | "icon" | "link";

export function SetRecordingDownloadButton({
  streamId,
  variant = "button",
  className = "",
  onClick,
}: {
  streamId: string;
  variant?: Variant;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "processing">("idle");

  async function handleDownload(e: React.MouseEvent) {
    onClick?.(e);
    e.preventDefault();
    e.stopPropagation();
    if (state === "loading") return;

    setState("loading");
    try {
      const res = await apiFetch(`/api/streams/${streamId}/recording`);
      const data = (await res.json()) as {
        ready?: boolean;
        processing?: boolean;
        downloadUrl?: string;
        filename?: string;
        error?: string;
      };

      if (!res.ok) {
        alert(data.error ?? "Could not fetch recording");
        setState("idle");
        return;
      }

      if (!data.ready) {
        setState("processing");
        alert(
          data.processing
            ? "Replay is still processing on the server. Try again in 3–5 minutes."
            : "No recording file is available for this set yet.",
        );
        setTimeout(() => setState("idle"), 1500);
        return;
      }

      const anchor = document.createElement("a");
      anchor.href = data.downloadUrl!;
      if (data.filename) anchor.download = data.filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setState("idle");
    } catch {
      alert("Download failed — check your connection and try again.");
      setState("idle");
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleDownload}
        disabled={state === "loading"}
        title="Download full set"
        aria-label="Download full set"
        className={`shrink-0 rounded-lg border border-white/10 p-2 text-zinc-500 hover:border-[#53fc18]/40 hover:text-[#53fc18] hover:bg-[#53fc18]/10 disabled:opacity-50 ${className}`}
      >
        {state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </button>
    );
  }

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={handleDownload}
        disabled={state === "loading"}
        className={`inline-flex items-center gap-1.5 text-sm font-medium text-[#53fc18] hover:text-[#7dff4d] disabled:opacity-50 ${className}`}
      >
        {state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {state === "processing" ? "Processing…" : "Download"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={state === "loading"}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 px-4 text-sm font-medium hover:bg-white/15 disabled:opacity-50 ${className}`}
    >
      {state === "loading" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Download set
    </button>
  );
}
