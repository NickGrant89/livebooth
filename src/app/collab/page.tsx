"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, Radio, Check, X, Loader2, Video } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GoLivePreview } from "@/components/GoLivePreview";
import { apiFetch } from "@/lib/fetch-client";

interface PartnerStream {
  id: string;
  title: string;
  status: string;
  ingestKey: string;
  rtmpUrl: string;
  playbackUrl: string;
  ingestMode?: "livepeer" | "local" | "demo";
}

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
  hostStreamStatus?: string;
  compositorActive?: boolean;
  partnerStream?: PartnerStream | null;
}

export default function CollabPage() {
  const { user, refresh } = useAuth();
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [partner, setPartner] = useState("");
  const [split, setSplit] = useState(50);
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rtmpOnline, setRtmpOnline] = useState<boolean | null>(null);

  const loadCollabs = useCallback(() => {
    if (!user) return;
    apiFetch("/api/collab")
      .then((r) => r.json())
      .then((d) => setCollabs(d.collabs ?? []));
  }, [user]);

  useEffect(() => {
    loadCollabs();
    apiFetch("/api/rtmp/health")
      .then((r) => r.json())
      .then((d) => setRtmpOnline(typeof d.reachable === "boolean" ? d.reachable : null))
      .catch(() => setRtmpOnline(null));
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
        splitRatio: split / 100,
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
    setLoading(true);
    const res = await apiFetch("/api/collab", {
      method: "PATCH",
      body: JSON.stringify({ collabId: id, accept }),
    });
    setLoading(false);
    if (res.ok) {
      await refresh();
      loadCollabs();
    }
  }

  async function publishPartnerFeed(streamId: string) {
    setLoading(true);
    const res = await apiFetch("/api/collab", {
      method: "PUT",
      body: JSON.stringify({ streamId }),
    });
    setLoading(false);
    if (res.ok) {
      await refresh();
      loadCollabs();
    }
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Users className="h-12 w-12 text-[#53fc18] mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">B2B Collab Mode</h1>
        <p className="text-zinc-400 mb-6">
          Stream remotely with another DJ — dual video on one booth, tips split automatically.
        </p>
        <Link href="/login" className="btn-primary inline-block rounded-xl px-6 py-3 text-sm">
          Sign in
        </Link>
      </div>
    );
  }

  const incoming = collabs.filter((c) => c.canRespond);
  const sent = collabs.filter((c) => c.role === "host" && c.status === "pending");
  const active = collabs.filter((c) => c.status === "active");
  const myPartnerCollab = active.find((c) => c.role === "partner" && c.partnerStream);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
        <Users className="h-8 w-8 text-[#53fc18]" />
        Collab Mode
      </h1>
      <p className="text-zinc-400 mb-8">
        Remote B2B sets — each DJ streams from their own location. When both feeds are live, LiveBooth
        mixes video and audio into one synced booth on the host page. Tips split by your chosen ratio.
      </p>

      {user.role === "dj" && !myPartnerCollab && (
        <div className="glass rounded-2xl p-6 mb-8">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#53fc18]" />
            Invite a DJ
          </h2>
          {!user.liveStream ? (
            <p className="text-zinc-500 text-sm">
              <Link href="/go-live" className="text-[#53fc18] hover:underline">
                Go live
              </Link>{" "}
              first (preview or live) to send collab invites.
            </p>
          ) : (
            <div className="space-y-3">
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
              <label className="block text-xs text-zinc-500">
                Partner tip share: {split}%
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={split}
                  onChange={(e) => setSplit(Number(e.target.value))}
                  className="mt-1 w-full accent-[#53fc18]"
                />
              </label>
            </div>
          )}
          {msg && (
            <p className={`text-sm mt-2 ${msgOk ? "text-[#53fc18]" : "text-red-400"}`}>{msg}</p>
          )}
        </div>
      )}

      {myPartnerCollab?.partnerStream && (
        <div className="glass rounded-2xl p-6 mb-8 border border-[#53fc18]/20">
          <h2 className="font-semibold mb-2 flex items-center gap-2 text-[#53fc18]">
            <Video className="h-4 w-4" />
            Your collab feed · {myPartnerCollab.host}
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            Stream from your location — your video appears on{" "}
            <Link href={`/stream/${myPartnerCollab.hostUsername}`} className="text-[#53fc18] hover:underline">
              @{myPartnerCollab.hostUsername}&apos;s booth
            </Link>
            . You earn {Math.round(myPartnerCollab.splitRatio * 100)}% of tips.
          </p>
          {myPartnerCollab.partnerStream.status === "preparing" ? (
            <GoLivePreview
              title={myPartnerCollab.partnerStream.title}
              djName={user.displayName ?? user.username}
              playbackUrl={myPartnerCollab.partnerStream.playbackUrl}
              rtmpUrl={myPartnerCollab.partnerStream.rtmpUrl}
              ingestKey={myPartnerCollab.partnerStream.ingestKey}
              ingestMode={myPartnerCollab.partnerStream.ingestMode}
              rtmpOnline={rtmpOnline}
              onPublish={() => publishPartnerFeed(myPartnerCollab.partnerStream!.id)}
              publishing={loading}
            />
          ) : (
            <div className="rounded-xl border border-[#53fc18]/30 bg-[#53fc18]/5 p-4">
              <p className="text-sm text-[#53fc18] font-medium">Your collab feed is live</p>
              <Link
                href={`/stream/${myPartnerCollab.hostUsername}`}
                className="text-xs text-zinc-400 hover:text-[#53fc18] mt-2 inline-block"
              >
                View combined booth →
              </Link>
            </div>
          )}
        </div>
      )}

      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold text-[#53fc18] text-sm uppercase tracking-wider mb-3">
            Active collabs
          </h2>
          <div className="space-y-2">
            {active.map((c) => (
              <div key={c.id} className="glass rounded-xl p-4 border border-[#53fc18]/20">
                <p className="font-medium">{c.streamTitle}</p>
                <p className="text-sm text-zinc-400">
                  {c.host} + {c.partner} · partner {Math.round(c.splitRatio * 100)}% / host{" "}
                  {Math.round((1 - c.splitRatio) * 100)}%
                </p>
                {c.role === "host" && c.compositorActive && (
                  <p className="text-xs text-[#53fc18] mt-1">Synced B2B mix active — one stream for fans</p>
                )}
                {c.role === "host" && !c.compositorActive && c.partnerStream?.status === "live" && (
                  <p className="text-xs text-amber-400/90 mt-1">Building synced mix… (PiP fallback until ready)</p>
                )}
                {c.role === "host" && c.partnerStream?.status === "preparing" && (
                  <p className="text-xs text-amber-400/90 mt-1">Waiting for partner OBS feed…</p>
                )}
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
          <h2 className="font-semibold text-zinc-400 text-sm uppercase tracking-wider mb-3">
            Invites for you
          </h2>
          <div className="space-y-2">
            {incoming.map((c) => (
              <div key={c.id} className="glass rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{c.streamTitle}</p>
                  <p className="text-sm text-zinc-500">
                    From {c.host} · You get {Math.round(c.splitRatio * 100)}% of tips
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Accept to get your own RTMP key and stream remotely.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => respond(c.id, true)}
                    disabled={loading}
                    className="p-2 rounded-lg bg-[#53fc18]/20 text-[#53fc18]"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => respond(c.id, false)}
                    disabled={loading}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {sent.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold text-zinc-400 text-sm uppercase tracking-wider mb-3">
            Sent invites (waiting)
          </h2>
          <div className="space-y-2">
            {sent.map((c) => (
              <div key={c.id} className="glass rounded-xl p-4">
                <p className="font-medium">{c.streamTitle}</p>
                <p className="text-sm text-zinc-500">
                  Waiting for @{c.partnerUsername} to accept ({Math.round(c.splitRatio * 100)}% partner
                  split)
                </p>
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
