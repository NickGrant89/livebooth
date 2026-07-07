"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Circle,
  Copy,
  FlaskConical,
  Loader2,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { CameraProbe } from "@/components/CameraProbe";

const CollabWebRtcStudio = dynamic(
  () => import("@/components/CollabWebRtcStudio").then((m) => ({ default: m.CollabWebRtcStudio })),
  { ssr: false, loading: () => <p className="text-zinc-500 text-sm py-4">Loading studio…</p> },
);

type CheckItem = {
  id: string;
  ok: boolean;
  label: string;
  detail: string;
  action?: { label: string; href: string };
};

type Diagnostics = {
  webrtcEnabled: boolean;
  livekitReachable: boolean | null;
  username: string;
  checks: CheckItem[];
  studioReady: boolean;
  studio: {
    collabId: string;
    role: "host" | "partner";
    hostUsername: string;
    partnerUsername: string | null;
    compositorActive?: boolean;
  } | null;
  pendingInvite:
    | { collabId: string; partnerUsername?: string; hostUsername?: string; canAccept?: boolean }
    | null;
};

export default function CollabTestPage() {
  const { user, refresh } = useAuth();
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [partner, setPartner] = useState("livestream");
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(true);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    apiFetch("/api/collab/diagnostics")
      .then((r) => r.json())
      .then(setDiag)
      .catch(() => setDiag(null));
  }, [user]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const testUrl =
    typeof window !== "undefined" ? `${window.location.origin}/collab/test` : "/collab/test";

  async function quickStart() {
    if (!partner.trim()) return;
    setLoading(true);
    setMsg("");
    const res = await apiFetch("/api/collab/quick-start", {
      method: "POST",
      body: JSON.stringify({ partnerUsername: partner.trim() }),
    });
    const data = await res.json();
    setMsgOk(res.ok);
    setMsg(res.ok ? data.message : data.error ?? "Setup failed");
    if (res.ok) {
      await refresh();
      load();
    }
    setLoading(false);
  }

  async function acceptInvite(collabId: string) {
    setLoading(true);
    const res = await apiFetch("/api/collab", {
      method: "PATCH",
      body: JSON.stringify({ collabId, accept: true }),
    });
    setLoading(false);
    if (res.ok) {
      await refresh();
      load();
      setMsgOk(true);
      setMsg("Accepted — tap Join studio below.");
    } else {
      const data = await res.json();
      setMsgOk(false);
      setMsg(data.error ?? "Could not accept");
    }
  }

  async function declineInvite(collabId: string) {
    setLoading(true);
    await apiFetch("/api/collab", {
      method: "PATCH",
      body: JSON.stringify({ collabId, accept: false }),
    });
    setLoading(false);
    load();
  }

  function copyLink() {
    void navigator.clipboard.writeText(testUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <FlaskConical className="h-12 w-12 text-[#53fc18] mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Collab Test Lab</h1>
        <p className="text-zinc-400 mb-6">Sign in to test WebRTC collab step by step.</p>
        <Link href="/login" className="btn-primary inline-block rounded-xl px-6 py-3 text-sm">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FlaskConical className="h-8 w-8 text-[#53fc18]" />
          Collab Test Lab
        </h1>
        <Link href="/collab" className="text-xs text-zinc-500 hover:text-[#53fc18] shrink-0 mt-2">
          Full collab page →
        </Link>
      </div>
      <p className="text-zinc-400 mb-6 text-sm">
        Easier testing — check each step, test your camera alone, then one-click setup for a real
        collab.
      </p>

      <section className="glass rounded-2xl p-5 mb-6 border border-white/10">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400 mb-3">
          Step 1 · System check
        </h2>
        <ul className="space-y-2">
          {(diag?.checks ?? []).map((c) => (
            <li key={c.id} className="flex gap-3 text-sm">
              {c.ok ? (
                <CheckCircle2 className="h-4 w-4 text-[#53fc18] shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={c.ok ? "text-zinc-200" : "text-amber-200"}>{c.label}</p>
                <p className="text-xs text-zinc-500">{c.detail}</p>
                {c.action && !c.ok && (
                  <Link href={c.action.href} className="text-xs text-[#53fc18] hover:underline">
                    {c.action.label} →
                  </Link>
                )}
              </div>
            </li>
          ))}
          {!diag && (
            <li className="text-zinc-500 text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </li>
          )}
        </ul>
      </section>

      <section className="glass rounded-2xl p-5 mb-6 border border-[#53fc18]/20">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-[#53fc18] mb-2">
          Step 2 · Test camera
        </h2>
        <CameraProbe />
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-zinc-500 mb-3">
            Step 2b — same camera through LiveKit (studio path). Only try this if Step 2a works.
          </p>
          {diag?.webrtcEnabled ? (
            <CollabWebRtcStudio mode="sandbox" />
          ) : (
            <p className="text-sm text-amber-400/90">WebRTC is off on this server — cannot test.</p>
          )}
        </div>
      </section>

      <section className="glass rounded-2xl p-5 mb-6 border border-white/10">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400 mb-2">
          Step 3 · Quick collab setup (host)
        </h2>
        <p className="text-xs text-zinc-500 mb-3">
          Creates a preview stream + sends invite automatically. Use{" "}
          <strong className="text-zinc-300">two accounts</strong> (e.g. you = host, partner on
          phone).
        </p>
        <div className="flex gap-2 mb-3">
          <input
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
            placeholder="Partner username"
            className="flex-1 rounded-xl bg-white/[0.04] border border-white/10 px-4 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={quickStart}
            disabled={loading || !partner.trim() || !diag?.webrtcEnabled}
            className="btn-primary rounded-xl px-4 py-2.5 text-sm disabled:opacity-50 flex items-center gap-2 shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Quick setup
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-black/30 border border-white/10 px-3 py-2">
          <code className="text-[11px] text-zinc-400 flex-1 truncate">{testUrl}</code>
          <button
            type="button"
            onClick={copyLink}
            className="text-xs text-[#53fc18] flex items-center gap-1 shrink-0"
          >
            <Copy className="h-3 w-3" />
            {copied ? "Copied" : "Copy link for partner"}
          </button>
        </div>
        {msg && <p className={`text-sm mt-3 ${msgOk ? "text-[#53fc18]" : "text-red-400"}`}>{msg}</p>}
      </section>

      {diag?.pendingInvite?.canAccept && (
        <section className="glass rounded-2xl p-5 mb-6 border border-amber-500/30">
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-300" />
            Invite from @{diag.pendingInvite.hostUsername}
          </h2>
          <p className="text-xs text-zinc-500 mb-3">Accept to unlock the partner studio below.</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => acceptInvite(diag.pendingInvite!.collabId)}
              className="flex-1 rounded-xl bg-[#53fc18]/20 text-[#53fc18] py-2.5 text-sm font-medium flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4" /> Accept invite
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => declineInvite(diag.pendingInvite!.collabId)}
              className="rounded-xl bg-red-500/20 text-red-400 px-4 py-2.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {diag?.studioReady && diag.studio && (
        <section className="glass rounded-2xl p-5 mb-6 border border-[#53fc18]/30">
          <h2 className="font-semibold text-[#53fc18] mb-2">
            Step 4 · Join together ({diag.studio.role})
          </h2>
          <p className="text-xs text-amber-300/90 mb-2 font-medium">
            Both DJs must tap Join here — Step 2b is solo only and will not show your partner.
          </p>
          <p className="text-xs text-zinc-500 mb-4">
            {diag.studio.role === "host" ? (
              <>
                Host (@{diag.studio.hostUsername}) — partner @
                {diag.studio.partnerUsername} must also tap Join on their phone.
              </>
            ) : (
              <>
                Partner — host is @{diag.studio.hostUsername}. Both need camera on for the fan mix.
              </>
            )}
          </p>
          <CollabWebRtcStudio
            key={diag.studio.collabId}
            collabId={diag.studio.collabId}
            hostUsername={diag.studio.hostUsername}
            role={diag.studio.role}
            compositorActive={diag.studio.compositorActive}
          />
          {diag.studio.role === "host" && (
            <Link
              href={`/stream/${diag.studio.hostUsername}`}
              className="text-xs text-zinc-500 hover:text-[#53fc18] mt-3 inline-block"
            >
              Fan booth page → /stream/{diag.studio.hostUsername}
            </Link>
          )}
        </section>
      )}

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-zinc-500 space-y-1">
        <p className="font-medium text-zinc-400">Testing checklist</p>
        <p>1. Step 2a passes → browser allows camera.</p>
        <p>2. Step 2b passes → LiveKit studio path works.</p>
        <p>2. Host: Quick setup with partner username.</p>
        <p>3. Partner: open copied link, Accept, then Step 4 Join.</p>
        <p>4. Host: Step 4 Join on Mac. You should see &quot;2 DJs in this room&quot; and each other&apos;s video.</p>
      </section>
    </div>
  );
}
