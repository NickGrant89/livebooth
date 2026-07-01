"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { STREAM_REPORT_REASONS } from "@/lib/constants";

export function ReportStreamButton({ streamId }: { streamId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("inappropriate");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setError("");
    const res = await apiFetch(`/api/streams/report/${streamId}`, {
      method: "POST",
      body: JSON.stringify({ reason, details: details || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Report failed");
      return;
    }
    setDone(true);
    if (data.autoStopped) {
      setError("");
      alert("This stream was automatically stopped due to multiple reports.");
      window.location.reload();
    }
  }

  if (done && !error) {
    return <p className="text-xs text-zinc-500">Report submitted. Thank you.</p>;
  }

  return (
    <div className="mt-4 pt-4 border-t border-white/5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors"
        >
          <Flag className="h-3.5 w-3.5" />
          Report stream
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-400">Report this stream</p>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-xs"
          >
            {STREAM_REPORT_REASONS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Optional details…"
            rows={2}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-xs resize-none"
          />
          <div className="flex gap-2">
            <button type="button" onClick={submit} className="rounded-lg bg-red-500/20 border border-red-500/40 px-3 py-1 text-xs font-bold text-red-300">
              Submit report
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-500 underline">Cancel</button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <p className="text-[10px] text-zinc-600">3+ reports in 15 minutes auto-stops the stream for review.</p>
        </div>
      )}
    </div>
  );
}
