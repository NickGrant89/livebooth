"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, Music } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";

interface Request {
  id: string;
  trackTitle: string;
  trackArtist?: string;
  amount: number;
  fan: string;
  vip?: boolean;
}

export function RequestQueue({
  streamId,
  compact = false,
}: {
  streamId: string;
  compact?: boolean;
}) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function load() {
      const res = await apiFetch(`/api/requests?streamId=${streamId}`);
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error ?? "Cannot load requests");
        return;
      }
      setLoadError("");
      setRequests(data.requests ?? []);
    }
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [streamId]);

  async function resolve(requestId: string, accept: boolean) {
    const res = await apiFetch("/api/requests", {
      method: "PATCH",
      body: JSON.stringify({ requestId, accept }),
    });
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } else {
      const data = await res.json();
      setLoadError(data.error ?? "Could not update request");
    }
  }

  return (
    <div className={`rounded-xl border border-purple-500/20 bg-purple-500/5 ${compact ? "p-4" : "p-5"}`}>
      <h2 className="font-semibold mb-1 flex items-center gap-2">
        <Music className="h-4 w-4 text-purple-300" />
        Crowd Requests
        {requests.length > 0 && (
          <span className="text-xs font-bold bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full">
            {requests.length}
          </span>
        )}
      </h2>
      {!compact && (
        <p className="text-xs text-zinc-500 mb-3">
          Fans pay {10} DROP to request tracks from stream chat. Accept to keep payment, decline to refund (minus 1 DROP fee).
        </p>
      )}
      {loadError && <p className="text-xs text-red-400 mb-2">{loadError}</p>}
      {requests.length === 0 ? (
        <p className="text-sm text-zinc-500 py-2">No pending requests — waiting for fans…</p>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
              <div>
                <p className="text-sm font-medium">
                  {r.trackArtist ? `${r.trackArtist} — ${r.trackTitle}` : r.trackTitle}
                </p>
                <p className="text-xs text-zinc-500">
                  {r.fan}{r.vip ? " ⭐ VIP" : ""} · {r.amount} DROP
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => resolve(r.id, true)}
                  title="Accept"
                  className="rounded p-1.5 bg-[#53fc18]/20 text-[#53fc18] hover:bg-[#53fc18]/30"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => resolve(r.id, false)}
                  title="Decline"
                  className="rounded p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!compact && (
        <Link href="/dashboard" className="text-xs text-zinc-600 hover:text-zinc-400 mt-2 inline-block">
          Also on dashboard →
        </Link>
      )}
    </div>
  );
}
