"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Users, Radio, Check, X, Loader2, Video, FlaskConical } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GoLivePreview } from "@/components/GoLivePreview";
import { StreamPlayer } from "@/components/StreamPlayer";
import { apiFetch } from "@/lib/fetch-client";

const CollabWebRtcStudio = dynamic(
  () => import("@/components/CollabWebRtcStudio").then((m) => ({ default: m.CollabWebRtcStudio })),
  { ssr: false, loading: () => <p className="text-zinc-500 text-sm py-4">Loading WebRTC studio…</p> },
);

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
  hostStream?: PartnerStream | null;
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
  const [webrtcEnabled, setWebrtcEnabled] = useState(false);
  const [primaryStudio, setPrimaryStudio] = useState<{
    collabId: string;
    role: "host" | "partner";
    hostUsername: string;
    partnerUsername: string;
    compositorActive?: boolean;
    hostStreamStatus?: string;
    hasPartnerStream?: boolean;
  } | null>(null);

  const loadCollabs = useCallback(() => {
    if (!user) return;
    apiFetch("/api/collab")
      .then((r) => r.json())
      .then((d) => {
        setCollabs(d.collabs ?? []);
        setWebrtcEnabled(Boolean(d.webrtcEnabled));
        setPrimaryStudio(d.primaryStudio ?? null);
      })
      .catch(() => {
        setCollabs([]);
        setWebrtcEnabled(false);
      });
  }, [user]);

  useEffect(() => {
    loadCollabs();
    apiFetch("/api/rtmp/health")
      .then((r) => r.json())
      .then((d) => setRtmpOnline(typeof d.reachable === "boolean" ? d.reachable : null))
      .catch(() => setRtmpOnline(null));
  }, [loadCollabs]);

  useEffect(() => {
    const hasActive = collabs.some((c) => c.status === "active");
    if (!hasActive) return;
    const interval = setInterval(loadCollabs, 10000);
    return () => clearInterval(interval);
  }, [collabs, loadCollabs]);

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
  const myPartnerCollab =
    active.find((c) => c.id === primaryStudio?.collabId && c.role === "partner") ??
    active.find((c) => c.role === "partner" && c.partnerStream);
  const myHostCollab =
    active.find((c) => c.id === primaryStudio?.collabId && c.role === "host") ??
    active.find((c) => c.role === "host");

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
        <Users className="h-8 w-8 text-[#53fc18]" />
        Collab Mode
      </h1>
      <p className="text-zinc-400 mb-4">
        Remote B2B sets — each DJ streams from their own location. When both feeds are live, LiveBooth
        mixes video and audio into one synced booth on the host page. Tips split by your chosen ratio.
      </p>

      <Link
        href="/collab/test"
        className="flex items-center gap-3 rounded-xl border border-[#53fc18]/40 bg-[#53fc18]/10 px-4 py-3 mb-8 hover:bg-[#53fc18]/15 transition-colors"
      >
        <FlaskConical className="h-5 w-5 text-[#53fc18] shrink-0" />
        <div>
          <p className="text-sm font-semibold text-[#53fc18]">Collab Test Lab</p>
          <p className="text-xs text-zinc-400">
            Easier step-by-step testing — camera sandbox, quick setup, join studio.
          </p>
        </div>
      </Link>

      {myHostCollab && webrtcEnabled && (
        <div className="rounded-xl border border-[#53fc18]/40 bg-[#53fc18]/10 px-4 py-3 mb-6 text-sm">
          <p className="text-[#53fc18] font-semibold">Step 1 — tap the green button below</p>
          <p className="text-xs text-zinc-400 mt-1">
            <strong className="text-zinc-200">Join collab studio (camera + mic)</strong> — one tap,
            allow camera when asked. Your partner does the same on their phone.
          </p>
          <Link href="#host-studio" className="text-xs text-[#53fc18] hover:underline mt-2 inline-block">
            Jump to join button ↓
          </Link>
        </div>
      )}

      {myHostCollab && !webrtcEnabled && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 mb-6 text-sm text-amber-200/90">
          WebRTC studio is off on this server — use Go Live + OBS for the host feed and RTMP on /collab
          for your partner.
        </div>
      )}

      {myHostCollab && !webrtcEnabled && (
        <div className="glass rounded-2xl p-6 mb-8 border border-amber-500/30">
          <h2 className="font-semibold mb-2 flex items-center gap-2 text-amber-300">
            <Video className="h-4 w-4" />
            Host studio · {myHostCollab.streamTitle}
          </h2>
          <p className="text-sm text-zinc-400">
            WebRTC studio is not enabled on this deployment. Stream from{" "}
            <Link href="/go-live" className="text-[#53fc18] hover:underline">
              Go Live
            </Link>{" "}
            with OBS instead, and ask your partner to use RTMP on /collab.
          </p>
        </div>
      )}

      {myHostCollab && webrtcEnabled && (
        <div id="host-studio" className="glass rounded-2xl p-6 mb-8 border border-[#53fc18]/20">
          <h2 className="font-semibold mb-2 flex items-center gap-2 text-[#53fc18]">
            <Video className="h-4 w-4" />
            Host studio · {myHostCollab.streamTitle}
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            WebRTC collab with @{myHostCollab.partnerUsername} — fans watch{" "}
            {myHostCollab.hostStreamStatus === "live" ? (
              <Link href={`/stream/${myHostCollab.hostUsername}`} className="text-[#53fc18] hover:underline">
                your booth
              </Link>
            ) : (
              <span className="text-zinc-400">your booth (publish from Go Live first)</span>
            )}
            .
          </p>
          {myHostCollab.hostStreamStatus !== "live" && (
            <p className="text-xs text-zinc-500 mb-4">
              Tip: you can join the studio first. Publish from{" "}
              <Link href="/go-live" className="text-[#53fc18] hover:underline">
                Go Live
              </Link>{" "}
              when ready so fans see the LIVE badge.
            </p>
          )}
          <CollabWebRtcStudio
            key={myHostCollab.id}
            collabId={myHostCollab.id}
            hostUsername={myHostCollab.hostUsername}
            role="host"
            compositorActive={myHostCollab.compositorActive}
            hostStreamLive={myHostCollab.hostStreamStatus === "live"}
          />
        </div>
      )}

      {sent.length > 0 && !myHostCollab && (
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
                <p className="text-xs text-amber-400/90 mt-2">
                  Host WebRTC studio appears here after they accept — you cannot open it until the collab is
                  active.
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

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
            {myPartnerCollab.hostStream?.status === "live" ? (
              <Link href={`/stream/${myPartnerCollab.hostUsername}`} className="text-[#53fc18] hover:underline">
                @{myPartnerCollab.hostUsername}&apos;s booth
              </Link>
            ) : (
              <span className="text-zinc-400">@{myPartnerCollab.hostUsername}&apos;s booth (host must publish first)</span>
            )}
            . You earn {Math.round(myPartnerCollab.splitRatio * 100)}% of tips.
          </p>
          {webrtcEnabled && (
            <div className="mb-4 space-y-3">
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
                <p className="font-medium">WebRTC: use the same page as the host</p>
                <p className="mt-1 text-zinc-400">
                  Open{" "}
                  <Link href="/collab/test" className="text-[#53fc18] hover:underline">
                    /collab/test → Step 4
                  </Link>{" "}
                  (recommended). Room ID must match host:{" "}
                  <code className="text-[10px] font-mono text-zinc-300">{myPartnerCollab.id.slice(0, 12)}…</code>
                </p>
              </div>
              <CollabWebRtcStudio
                key={myPartnerCollab.id}
                collabId={myPartnerCollab.id}
                hostUsername={myPartnerCollab.hostUsername}
                role="partner"
                compositorActive={myPartnerCollab.compositorActive}
                hostStreamLive={myPartnerCollab.hostStream?.status === "live"}
              />
            </div>
          )}
          {!webrtcEnabled && myPartnerCollab.hostStream?.status === "live" && (
            <div className="mb-4 rounded-xl border border-white/10 overflow-hidden bg-black">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 px-3 py-2 border-b border-white/10">
                Host feed · {myPartnerCollab.host}
              </p>
              <StreamPlayer
                djName={myPartnerCollab.host}
                streamTitle={myPartnerCollab.hostStream.title}
                viewers={0}
                playbackUrl={myPartnerCollab.hostStream.playbackUrl}
                isLive
                previewMode
              />
            </div>
          )}
          {!webrtcEnabled && myPartnerCollab.hostStream?.status === "preparing" && (
            <p className="text-xs text-amber-400/90 mb-4">Waiting for {myPartnerCollab.host} to go live…</p>
          )}
          {webrtcEnabled ? (
            <details className="mb-2 rounded-xl border border-white/10 p-3">
              <summary className="text-xs text-zinc-400 cursor-pointer">OBS / Larix RTMP (legacy)</summary>
              <div className="mt-3">
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
                  <p className="text-sm text-zinc-500">RTMP feed is live.</p>
                )}
              </div>
            </details>
          ) : myPartnerCollab.partnerStream.status === "preparing" ? (
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
              {myPartnerCollab.hostStream?.status === "live" ? (
                <Link
                  href={`/stream/${myPartnerCollab.hostUsername}`}
                  className="text-xs text-zinc-400 hover:text-[#53fc18] mt-2 inline-block"
                >
                  View combined booth →
                </Link>
              ) : (
                <p className="text-xs text-amber-400/90 mt-2">Waiting for host to publish the booth stream…</p>
              )}
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
                {c.role === "host" && !c.compositorActive && webrtcEnabled && (
                  <p className="text-xs text-amber-400/90 mt-1">
                    Open host WebRTC studio below — both DJs need camera on (OBS alone does not count).
                  </p>
                )}
                {c.role === "host" && !c.compositorActive && !webrtcEnabled && c.partnerStream?.status === "live" && (
                  <p className="text-xs text-amber-400/90 mt-1">Building synced mix… (PiP fallback until ready)</p>
                )}
                {c.role === "host" && !webrtcEnabled && c.partnerStream?.status === "preparing" && (
                  <p className="text-xs text-amber-400/90 mt-1">Waiting for partner RTMP feed…</p>
                )}
                {c.role === "host" && c.status === "active" && webrtcEnabled && (
                  <Link href="#host-studio" className="text-xs text-[#53fc18] hover:underline mt-2 inline-block">
                    Open host WebRTC studio ↓
                  </Link>
                )}
                {c.role === "host" && c.status === "active" && !webrtcEnabled && (
                  <p className="text-xs text-amber-400/90 mt-2">
                    WebRTC studio unavailable — use Go Live + OBS on this deployment.
                  </p>
                )}
                {c.role === "host" && c.status === "pending" && (
                  <p className="text-xs text-amber-400/90 mt-2">
                    Waiting for partner to accept — host WebRTC studio unlocks after that.
                  </p>
                )}
                <Link
                  href={`/stream/${c.hostUsername}`}
                  className={`text-xs mt-1 inline-block ${
                    c.hostStreamStatus === "live"
                      ? "text-[#53fc18] hover:underline"
                      : "text-zinc-600 pointer-events-none"
                  }`}
                >
                  {c.hostStreamStatus === "live" ? "View stream →" : "View stream (host must publish first)"}
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

      {user.role === "dj" && user.liveStream && !myHostCollab && !myPartnerCollab && active.length === 0 && sent.length === 0 && (
        <div className="glass rounded-xl p-4 mb-8 border border-white/10">
          <p className="text-sm text-zinc-400">
            <strong className="text-zinc-200">To open WebRTC as host:</strong> invite a partner above → they
            accept on /collab → a <span className="text-[#53fc18]">Host studio</span> card appears on this
            page with <span className="text-zinc-300">Open WebRTC studio</span>.
          </p>
        </div>
      )}

      {collabs.length === 0 && (
        <p className="text-zinc-600 text-sm py-8 text-center">No collab invites yet</p>
      )}
    </div>
  );
}
