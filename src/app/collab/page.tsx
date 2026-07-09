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

  async function publishHostFeed(streamId: string) {
    setLoading(true);
    const res = await apiFetch("/api/streams/go-live/publish", {
      method: "POST",
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
        Remote B2B sets — each DJ streams from their own location via OBS or Larix (RTMP). When both
        feeds are live, LiveBooth mixes video and audio into one synced booth on the host page. Tips
        split by your chosen ratio.
      </p>

      <Link
        href="/collab/test"
        className="flex items-center gap-3 rounded-xl border border-[#53fc18]/40 bg-[#53fc18]/10 px-4 py-3 mb-8 hover:bg-[#53fc18]/15 transition-colors"
      >
        <FlaskConical className="h-5 w-5 text-[#53fc18] shrink-0" />
        <div>
          <p className="text-sm font-semibold text-[#53fc18]">Collab Test Lab</p>
          <p className="text-xs text-zinc-400">
            Step-by-step RTMP collab setup — invite partner, stream from OBS/Larix, verify the mix.
          </p>
        </div>
      </Link>

      {(myHostCollab || myPartnerCollab) && (
        <div className="rounded-xl border border-[#53fc18]/40 bg-[#53fc18]/10 px-4 py-3 mb-6 text-sm">
          <p className="text-[#53fc18] font-semibold">How B2B works (RTMP)</p>
          <ol className="text-xs text-zinc-400 mt-2 space-y-1 list-decimal list-inside">
            <li>Host streams to LiveBooth from OBS (server URL + stream key below).</li>
            <li>Partner accepts invite and streams their RTMP key from OBS or Larix on this page.</li>
            <li>
              Fans watch one mixed booth at{" "}
              {myHostCollab ? (
                <Link href={`/stream/${myHostCollab.hostUsername}`} className="text-[#53fc18] hover:underline">
                  /stream/{myHostCollab.hostUsername}
                </Link>
              ) : myPartnerCollab ? (
                <Link href={`/stream/${myPartnerCollab.hostUsername}`} className="text-[#53fc18] hover:underline">
                  /stream/{myPartnerCollab.hostUsername}
                </Link>
              ) : (
                "the host booth"
              )}
              .
            </li>
          </ol>
          <p className="text-[10px] text-zinc-500 mt-2">
            RTMP is one-way to the server — use FaceTime, Discord, or a phone call to talk to each
            other while you play. That is separate from LiveBooth.
          </p>
        </div>
      )}

      {myHostCollab && (
        <div id="host-studio" className="glass rounded-2xl p-6 mb-8 border border-[#53fc18]/20">
          <h2 className="font-semibold mb-2 flex items-center gap-2 text-[#53fc18]">
            <Video className="h-4 w-4" />
            Host feed · {myHostCollab.streamTitle}
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            With @{myHostCollab.partnerUsername} — stream from OBS. When both RTMP feeds are live, the
            synced mix appears on{" "}
            {myHostCollab.hostStreamStatus === "live" ? (
              <Link href={`/stream/${myHostCollab.hostUsername}`} className="text-[#53fc18] hover:underline">
                your booth
              </Link>
            ) : (
              <span className="text-zinc-400">your booth (publish below first)</span>
            )}
            .
          </p>
          {myHostCollab.compositorActive && (
            <p className="text-xs text-[#53fc18] mb-4 font-medium">Synced B2B mix is live for fans.</p>
          )}
          {!myHostCollab.compositorActive && myHostCollab.partnerStream?.status === "live" && (
            <p className="text-xs text-amber-400/90 mb-4">Partner is live — building synced mix…</p>
          )}
          {!myHostCollab.compositorActive && myHostCollab.partnerStream?.status !== "live" && (
            <p className="text-xs text-amber-400/90 mb-4">Waiting for partner RTMP feed…</p>
          )}
          {user.liveStream && user.liveStream.id === myHostCollab.streamId ? (
            user.liveStream.status === "live" ? (
              <div className="rounded-xl border border-[#53fc18]/30 bg-[#53fc18]/5 p-4 mb-4">
                <p className="text-sm text-[#53fc18] font-medium">Your host RTMP feed is live</p>
                <Link
                  href={`/stream/${myHostCollab.hostUsername}`}
                  className="text-xs text-zinc-400 hover:text-[#53fc18] mt-2 inline-block"
                >
                  View booth →
                </Link>
              </div>
            ) : (
              <GoLivePreview
                title={user.liveStream.title}
                djName={user.displayName ?? user.username}
                playbackUrl={user.liveStream.playbackUrl ?? ""}
                rtmpUrl={user.liveStream.rtmpUrl ?? ""}
                ingestKey={user.liveStream.ingestKey ?? ""}
                ingestMode={user.liveStream.ingestMode}
                rtmpOnline={rtmpOnline}
                onPublish={() => publishHostFeed(user.liveStream!.id)}
                publishing={loading}
              />
            )
          ) : (
            <p className="text-sm text-zinc-400 mb-4">
              Open{" "}
              <Link href="/go-live" className="text-[#53fc18] hover:underline">
                Go Live
              </Link>{" "}
              to create a stream session and get your RTMP key.
            </p>
          )}
          {webrtcEnabled && (
            <details className="mt-4 rounded-xl border border-white/10 p-3">
              <summary className="text-xs text-zinc-400 cursor-pointer">
                Browser WebRTC studio (experimental — needs larger VPS)
              </summary>
              <div className="mt-3">
                <CollabWebRtcStudio
                  key={myHostCollab.id}
                  collabId={myHostCollab.id}
                  hostUsername={myHostCollab.hostUsername}
                  role="host"
                  compositorActive={myHostCollab.compositorActive}
                  hostStreamLive={myHostCollab.hostStreamStatus === "live"}
                />
              </div>
            </details>
          )}
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
                  Host RTMP panel appears here after they accept — both DJs stream via OBS/Larix.
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
          {myPartnerCollab.hostStream?.status === "live" && (
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
          {myPartnerCollab.hostStream?.status === "preparing" && (
            <p className="text-xs text-amber-400/90 mb-4">Waiting for {myPartnerCollab.host} to go live…</p>
          )}
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
          {webrtcEnabled && (
            <details className="mt-4 rounded-xl border border-white/10 p-3">
              <summary className="text-xs text-zinc-400 cursor-pointer">
                Browser WebRTC studio (experimental)
              </summary>
              <div className="mt-3">
                <CollabWebRtcStudio
                  key={myPartnerCollab.id}
                  collabId={myPartnerCollab.id}
                  hostUsername={myPartnerCollab.hostUsername}
                  role="partner"
                  compositorActive={myPartnerCollab.compositorActive}
                  hostStreamLive={myPartnerCollab.hostStream?.status === "live"}
                />
              </div>
            </details>
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
                  <p className="text-xs text-amber-400/90 mt-1">
                    Partner RTMP is live — building synced mix… (PiP fallback until ready)
                  </p>
                )}
                {c.role === "host" && !c.compositorActive && c.partnerStream?.status === "preparing" && (
                  <p className="text-xs text-amber-400/90 mt-1">Waiting for partner RTMP feed…</p>
                )}
                {c.role === "host" && c.status === "active" && (
                  <Link href="#host-studio" className="text-xs text-[#53fc18] hover:underline mt-2 inline-block">
                    Open host RTMP panel ↓
                  </Link>
                )}
                {c.role === "host" && c.status === "pending" && (
                  <p className="text-xs text-amber-400/90 mt-2">
                    Waiting for partner to accept — host RTMP panel unlocks after that.
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
            <strong className="text-zinc-200">To start a B2B set:</strong> invite a partner above → they
            accept on /collab → both stream via OBS or Larix using the RTMP keys on this page.
          </p>
        </div>
      )}

      {collabs.length === 0 && (
        <p className="text-zinc-600 text-sm py-8 text-center">No collab invites yet</p>
      )}
    </div>
  );
}
