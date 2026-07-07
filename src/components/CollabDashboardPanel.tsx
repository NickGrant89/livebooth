"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Users, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";

type CollabSummary = {
  id: string;
  streamTitle: string;
  partnerUsername: string;
  partner: string;
  status: string;
  splitRatio: number;
};

export function CollabDashboardPanel({ streamId }: { streamId: string }) {
  const [collab, setCollab] = useState<CollabSummary | null>(null);
  const [partner, setPartner] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    apiFetch("/api/collab")
      .then((r) => r.json())
      .then((d) => {
        const host = (d.collabs ?? []).find(
          (c: CollabSummary & { streamId: string; role: string }) =>
            c.streamId === streamId && c.role === "host",
        );
        setCollab(host ?? null);
      });
  }, [streamId]);

  useEffect(() => {
    load();
  }, [load]);

  async function invite() {
    if (!partner.trim()) return;
    setLoading(true);
    setMsg("");
    const res = await apiFetch("/api/collab", {
      method: "POST",
      body: JSON.stringify({
        streamId,
        partnerUsername: partner.trim().replace(/^@/, ""),
        splitRatio: 0.5,
      }),
    });
    const data = await res.json();
    setMsg(res.ok ? "Invite sent" : (data.error ?? "Failed"));
    if (res.ok) {
      setPartner("");
      load();
    }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> B2B collab
        </h3>
        <Link href="/collab" className="text-[10px] text-[#53fc18] hover:underline">
          Manage →
        </Link>
      </div>
      {collab ? (
        <p className="text-sm text-zinc-400">
          {collab.status === "active" ? (
            <>
              Active with <strong className="text-white">{collab.partner}</strong>
              {" — "}
              <Link href="/collab#host-studio" className="text-[#53fc18] hover:underline">
                open host WebRTC studio
              </Link>
            </>
          ) : (
            <>Waiting for @{collab.partnerUsername} to accept</>
          )}
        </p>
      ) : (
        <div className="flex gap-2">
          <input
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
            placeholder="Invite DJ username"
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={invite}
            disabled={loading || !partner.trim()}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
          </button>
        </div>
      )}
      {msg && <p className="text-xs text-zinc-500">{msg}</p>}
    </div>
  );
}
