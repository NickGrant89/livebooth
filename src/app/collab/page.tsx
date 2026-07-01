"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, Radio, Check, X, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";

interface Collab {
  id: string;
  streamId: string;
  streamTitle: string;
  host: string;
  hostUsername: string;
  partner: string;
  partnerUsername: string;
  splitRatio: number;
  status: string;
  role: "host" | "partner";
  canRespond: boolean;
}

export default function CollabPage() {
  const { user } = useAuth();
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [partner, setPartner] = useState("");
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadCollabs = useCallback(() => {
    if (!user) return;
    apiFetch("/api/collab")
      .then((r) => r.json())
      .then((d) => setCollabs(d.collabs ?? []));
  }, [user]);

  useEffect(() => {
    loadCollabs();
  }, [loadCollabs]);

  async function invite() {
    if (!user?.liveStream?.id || !partner.trim()) return;
    setLoading(true);
    setMsg("");
    const res = await apiFetch("/api/collab", {
      method: "POST",
      body: JSON.stringify({
        streamId: user.liveStream.id,
        partnerUsername: partner.trim().replace(/^@/, ""),
        splitRatio: 0.5,
      }),
    });
    const data = await res.json();
    setMsgOk(res.ok);
    setMsg(res.ok ? `Invite sent to @${partner.trim().replace(/^@/, "")}!` : (data.error ?? "Invite failed"));
    if (res.ok) {
      setPartner("");
      loadCollabs();
    }
    setLoading(false);
  }

  async function respond(id: string, accept: boolean) {
    const res = await apiFetch("/api/collab", {
      method: "PATCH",
      body: JSON.stringify({ collabId: id, accept }),
    });
    if (res.ok) loadCollabs();
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Users className="h-12 w-12 text-[#53fc18] mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">B2B Collab Mode</h1>
        <p className="text-zinc-400 mb-6">Stream back-to-back with another DJ. Tips split automatically.</p>
        <Link href="/login" className="btn-primary inline-block rounded-xl px-6 py-3 text-sm">Sign in</Link>
      </div>
    );
  }

  const incoming = collabs.filter((c) => c.canRespond);
  const sent = collabs.filter((c) => c.role === "host" && c.status === "pending");
  const active = collabs.filter((c) => c.status === "active");

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
        <Users className="h-8 w-8 text-[#53fc18]" />
        Collab Mode
      </h1>
      <p className="text-zinc-400 mb-8">
        Invite a DJ to your live set. When active, tips split {(0.5 * 100)}% / {(0.5 * 100)}% automatically.
      </p>

      {user.role === "dj" && (
        <div className="glass rounded-2xl p-6 mb-8">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#53fc18]" />
            Invite a DJ
          </h2>
          {!user.liveStream ? (
            <p className="text-zinc-500 text-sm">
              <Link href="/go-live" className="text-[#53fc18] hover:underline">Go live</Link> first to send collab invites.
            </p>
          ) : (
            <div className="flex gap-2">
              <input
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                placeholder="Partner username (e.g. bassqueen)"
                className="flex-1 rounded-xl bg-white/[0.04] border border-white/10 px-4 py-2.5 text-sm text-white"
              />
              <button
                onClick={invite}
                disabled={loading || !partner.trim()}
                className="btn-primary rounded-xl px-5 py-2.5 text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Invite
              </button>
            </div>
          )}
          {msg && (
            <p className={`text-sm mt-2 ${msgOk ? "text-[#53fc18]" : "text-red-400"}`}>{msg}</p>
          )}
          <p className="text-xs text-zinc-600 mt-3">
            Demo DJs: bassqueen, discodave, tranceangel, lofiwizard, hypemaster
          </p>
        </div>
      )}

      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold text-[#53fc18] text-sm uppercase tracking-wider mb-3">Active collabs</h2>
          <div className="space-y-2">
            {active.map((c) => (
              <div key={c.id} className="glass rounded-xl p-4 border border-[#53fc18]/20">
                <p className="font-medium">{c.streamTitle}</p>
                <p className="text-sm text-zinc-400">
                  {c.host} + {c.partner} · {c.splitRatio * 100}% split
                </p>
                <Link
                  href={`/stream/${c.hostUsername}`}
                  className="text-xs text-[#53fc18] hover:underline mt-1 inline-block"
                >
                  View stream →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {incoming.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold text-zinc-400 text-sm uppercase tracking-wider mb-3">Invites for you</h2>
          <div className="space-y-2">
            {incoming.map((c) => (
              <div key={c.id} className="glass rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.streamTitle}</p>
                  <p className="text-sm text-zinc-500">From {c.host} · You get {c.splitRatio * 100}% of tips</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => respond(c.id, true)} className="p-2 rounded-lg bg-[#53fc18]/20 text-[#53fc18]">
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => respond(c.id, false)} className="p-2 rounded-lg bg-red-500/20 text-red-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {sent.length > 0 && (
        <section>
          <h2 className="font-semibold text-zinc-400 text-sm uppercase tracking-wider mb-3">Sent invites (waiting)</h2>
          <div className="space-y-2">
            {sent.map((c) => (
              <div key={c.id} className="glass rounded-xl p-4">
                <p className="font-medium">{c.streamTitle}</p>
                <p className="text-sm text-zinc-500">Waiting for @{c.partnerUsername} to accept</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {collabs.length === 0 && (
        <p className="text-zinc-600 text-sm py-8 text-center">No collab invites yet</p>
      )}
    </div>
  );
}
