"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Radio,
  Mic,
  BookOpen,
  Sparkles,
  ExternalLink,
  Loader2,
  Settings2,
  KeyRound,
  PartyPopper,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { GenrePicker } from "@/components/GenrePicker";
import { GoLivePreview } from "@/components/GoLivePreview";
import { DJ_OBS_STEPS, GO_LIVE_STEPS } from "@/lib/guidance";
import { ShareLiveButton } from "@/components/ShareLiveButton";
import { ShareReminderBanner } from "@/components/ShareReminderBanner";
import { StreamDetailsFields } from "@/components/StreamDetailsFields";
import { useIngestWatch } from "@/hooks/useIngestWatch";
import { endStreamWithObsSync } from "@/lib/end-stream-client";
import { genreLabels } from "@/lib/constants";

type StreamInfo = {
  id: string;
  rtmpUrl: string;
  ingestKey: string;
  playbackUrl?: string | null;
  title?: string;
  status?: string;
  ingestMode?: "livepeer" | "local" | "demo";
};

function GoLiveStepper({ step }: { step: number }) {
  const progress = GO_LIVE_STEPS.length > 1 ? ((step - 1) / (GO_LIVE_STEPS.length - 1)) * 100 : 0;

  return (
    <div className="mb-8">
      <div className="relative px-2">
        <div className="absolute left-6 right-6 top-4 h-px bg-white/10" />
        <div
          className="absolute left-6 top-4 h-px bg-gradient-to-r from-[#53fc18] to-[#15CFF4] transition-all duration-500"
          style={{ width: `calc(${progress}% - 24px)` }}
        />
        <div className="relative grid grid-cols-5 gap-1">
          {GO_LIVE_STEPS.map((s, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={s.label} className="flex flex-col items-center text-center">
                <div
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    active
                      ? "bg-[#53fc18] text-black ring-4 ring-[#53fc18]/20"
                      : done
                        ? "bg-[#53fc18]/20 text-[#53fc18] border border-[#53fc18]/30"
                        : "bg-[#141416] text-zinc-500 border border-white/10"
                  }`}
                >
                  {done ? "✓" : n}
                </div>
                <p
                  className={`mt-2 hidden text-[10px] font-medium sm:block ${
                    active ? "text-white" : done ? "text-[#53fc18]/80" : "text-zinc-600"
                  }`}
                >
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-5 text-center text-sm text-zinc-400">{GO_LIVE_STEPS[step - 1]?.hint}</p>
    </div>
  );
}

function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Mic;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#53fc18]/20 bg-[#53fc18]/10">
          <Icon className="h-5 w-5 text-[#53fc18]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function GoLivePage() {
  const { user, refresh, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("live-band");
  const [bpmRange, setBpmRange] = useState("");
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rtmpOnline, setRtmpOnline] = useState<boolean | null>(null);
  const [obsSyncNote, setObsSyncNote] = useState<string | null>(null);

  const handleIngestLost = useCallback(async () => {
    const res = await apiFetch("/api/streams/go-live", { method: "DELETE" });
    if (!res.ok) return;
    setStreamInfo(null);
    setStep(1);
    setTitle("");
    setObsSyncNote("OBS stopped — your LiveBooth session was ended automatically.");
    await refresh();
  }, [refresh]);

  useIngestWatch({
    ingestKey: streamInfo?.ingestKey,
    isLive: streamInfo?.status === "live",
    onIngestLost: handleIngestLost,
  });

  useEffect(() => {
    apiFetch("/api/rtmp/health")
      .then((r) => r.json())
      .then((d: { mode?: string; reachable?: boolean | null }) => {
        if (d.mode === "local") setRtmpOnline(Boolean(d.reachable));
        else setRtmpOnline(null);
      })
      .catch(() => setRtmpOnline(null));
  }, []);

  const existingLive = user?.liveStream;

  function resumeLiveStream() {
    if (!existingLive?.id || !existingLive.ingestKey || !existingLive.rtmpUrl) return;
    setStreamInfo({
      id: existingLive.id,
      rtmpUrl: existingLive.rtmpUrl,
      ingestKey: existingLive.ingestKey,
      playbackUrl: existingLive.playbackUrl,
      title: existingLive.title,
      status: existingLive.status,
      ingestMode: existingLive.ingestMode,
    });
    setStep(existingLive.status === "live" ? 5 : 4);
  }

  async function cancelPreview() {
    const isPreview = step === 4 || streamInfo?.status === "preparing";
    if (
      isPreview &&
      !window.confirm("Discard this preview? Fans have not been notified and nothing will be published.")
    ) {
      return;
    }
    await endAndRestart();
  }

  async function endAndRestart() {
    if (
      streamInfo?.status === "live" &&
      !window.confirm("End your live stream? Followers will no longer see you on air.")
    ) {
      return;
    }
    setSubmitting(true);
    setError("");
    setObsSyncNote(null);
    const { res, obsStopped } = await endStreamWithObsSync(() =>
      apiFetch("/api/streams/go-live", { method: "DELETE" }),
    );
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not end stream");
      return;
    }
    setStreamInfo(null);
    setStep(1);
    setTitle("");
    if (obsStopped) {
      setObsSyncNote("Stream ended on LiveBooth and OBS was stopped.");
    } else if (streamInfo?.ingestMode === "local") {
      setObsSyncNote("Stream ended — click Stop Streaming in OBS if it's still running.");
    }
    await refresh();
  }

  async function startStream() {
    setSubmitting(true);
    setError("");
    const res = await apiFetch("/api/streams/go-live", {
      method: "POST",
      body: JSON.stringify({ title, genre, description: description || undefined, bpmRange: bpmRange || undefined }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create stream");
      return;
    }
    setStreamInfo(data.stream);
    await refresh();
    setStep(data.stream.status === "live" ? 5 : 4);
  }

  async function regenerateStreamKey() {
    if (!title.trim() && !streamInfo?.title) {
      setError("Add a set title first");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await apiFetch("/api/streams/go-live", {
      method: "POST",
      body: JSON.stringify({
        title: streamInfo?.title || title,
        description: description || undefined,
        genre,
        bpmRange: bpmRange || undefined,
        forceNew: true,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create new stream key");
      return;
    }
    setStreamInfo(data.stream);
    await refresh();
    setStep(4);
  }

  async function publishStream() {
    if (!streamInfo?.id) return;
    setSubmitting(true);
    setError("");
    const res = await apiFetch("/api/streams/go-live/publish", {
      method: "POST",
      body: JSON.stringify({ streamId: streamInfo.id }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to publish stream");
      return;
    }
    setStreamInfo(data.stream);
    await refresh();
    setStep(5);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center text-zinc-400">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#53fc18]" />
        Loading studio…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Radio className="mx-auto mb-4 h-12 w-12 text-[#53fc18]/60" />
        <h1 className="text-2xl font-bold mb-2">Go Live</h1>
        <p className="text-zinc-400 mb-6">Sign in with a creator account to start streaming.</p>
        <Link href="/login" className="rounded-xl bg-[#53fc18] px-6 py-3 text-sm font-bold text-black">
          Sign in
        </Link>
      </div>
    );
  }

  if (user.role === "station") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Radio className="h-14 w-14 text-[#53fc18] mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Radio station</h1>
        <p className="text-zinc-400 mb-6 max-w-md mx-auto">
          Station owners go live from the station dashboard in Settings — not the DJ go-live flow.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/settings#station-dashboard" className="rounded-xl bg-[#53fc18] px-6 py-3 text-sm font-bold text-black">
            Station dashboard
          </Link>
          <Link href="/help/stations" className="rounded-xl border border-white/10 px-6 py-3 text-sm text-zinc-300 hover:bg-white/5">
            Station guide
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== "dj" && user.role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-zinc-400 mb-4">You need a DJ account to go live.</p>
        <Link href="/signup" className="rounded-xl bg-[#53fc18] px-6 py-3 text-sm font-bold text-black">
          Sign up as DJ
        </Link>
      </div>
    );
  }

  const displayTitle = streamInfo?.title || title || user.liveStream?.title || "Live set";

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-8 pb-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-4 top-0 h-72 rounded-full bg-gradient-to-b from-[#53fc18]/12 via-[#15CFF4]/8 to-transparent blur-3xl"
      />

      <header className="relative mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#53fc18]/20 bg-[#53fc18]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#53fc18]">
          <Sparkles className="h-3.5 w-3.5" />
          Creator studio
        </span>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Go Live</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
          Set up your booth, preview your mix, then publish to fans.
        </p>
      </header>

      <GoLiveStepper step={step} />

      <div className="relative rounded-2xl border border-white/10 bg-[#141416]/95 shadow-2xl shadow-black/30 backdrop-blur-sm">
        <div className="border-b border-white/5 px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Step {step} of {GO_LIVE_STEPS.length}
          </p>
        </div>

        <div className="p-6">
          {existingLive && step < 4 && (
            <div className="mb-6 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-transparent p-4">
              <p className="text-sm text-amber-100">
                You already have an active session:{" "}
                <strong className="text-white">{existingLive.title}</strong>
                {existingLive.status === "preparing" && (
                  <span className="text-amber-200/80"> — preview only, not public yet</span>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resumeLiveStream}
                  className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
                >
                  {existingLive.status === "live" ? "Back to live booth" : "Continue preview"}
                </button>
                <button
                  type="button"
                  onClick={endAndRestart}
                  disabled={submitting}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                >
                  {submitting ? "Ending…" : "End & start fresh"}
                </button>
              </div>
            </div>
          )}

          {error && step !== 3 && (
            <p className="mb-4 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm text-red-300 text-center">
              {error}
            </p>
          )}
          {obsSyncNote && (
            <p className="mb-4 rounded-lg border border-[#53fc18]/25 bg-[#53fc18]/10 px-4 py-2 text-sm text-[#53fc18] text-center">
              {obsSyncNote}
            </p>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <StepHeader
                icon={Mic}
                title="Stream details"
                subtitle="Help fans discover your set with a clear title and genre."
              />
              <StreamDetailsFields
                title={title}
                description={description}
                onTitleChange={setTitle}
                onDescriptionChange={setDescription}
                titlePlaceholder="Friday night house session"
              />
              <div>
                <label className="block text-xs text-zinc-500 mb-2">Category / genre</label>
                <GenrePicker value={genre} onChange={setGenre} />
              </div>
              <select
                value={bpmRange}
                onChange={(e) => setBpmRange(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white text-sm"
              >
                <option value="">BPM range (optional)</option>
                <option value="90-110">90–110 BPM</option>
                <option value="110-125">110–125 BPM</option>
                <option value="125-140">125–140 BPM</option>
                <option value="140+">140+ BPM</option>
              </select>
              <button
                onClick={() => setStep(2)}
                disabled={!title.trim()}
                className="w-full rounded-xl bg-[#53fc18] py-3 text-sm font-bold text-black disabled:opacity-40"
              >
                Continue to OBS setup
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <StepHeader
                icon={Settings2}
                title="OBS setup"
                subtitle="Configure your encoder once — you'll copy credentials on the next step."
              />
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { n: "1", text: "OBS → Settings → Stream → Custom" },
                  { n: "2", text: "Paste server + stream key from LiveBooth" },
                  { n: "3", text: "Start Streaming and check bitrate in OBS" },
                ].map((item) => (
                  <div
                    key={item.n}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center"
                  >
                    <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#15CFF4]/10 text-sm font-bold text-[#15CFF4]">
                      {item.n}
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
              <details className="rounded-xl border border-white/10 bg-white/[0.02]">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm text-zinc-400 hover:text-zinc-200">
                  Full OBS checklist
                </summary>
                <ol className="border-t border-white/5 px-4 py-3 text-sm text-zinc-500 space-y-2 list-decimal list-inside">
                  {DJ_OBS_STEPS.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
              </details>
              {rtmpOnline === false && (
                <p className="text-xs text-red-300 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                  Streaming server unreachable — try again in a few minutes or check{" "}
                  <Link href="/support" className="text-red-200 underline">
                    live support
                  </Link>
                  .
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-zinc-400 hover:bg-white/5"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 rounded-xl bg-[#53fc18] py-3 text-sm font-bold text-black"
                >
                  Get stream key
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center">
              <StepHeader
                icon={KeyRound}
                title="Create stream key"
                subtitle="Generates private RTMP credentials. Fans aren't notified until you publish."
              />
              <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6">
                <p className="text-xl font-bold text-white">{title}</p>
                <p className="mt-1 text-sm text-zinc-400">{genreLabels[genre] ?? genre.replace("-", " ")}</p>
                {description && (
                  <p className="mt-3 text-sm text-zinc-500 line-clamp-2">{description}</p>
                )}
              </div>
              {error && (
                <p className="text-red-300 text-sm rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                  {error}
                </p>
              )}
              <button
                onClick={startStream}
                disabled={submitting}
                className="w-full rounded-xl bg-gradient-to-r from-[#53fc18] to-[#15CFF4] py-3.5 text-sm font-bold text-black disabled:opacity-50"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating credentials…
                  </span>
                ) : (
                  "Create stream key & preview"
                )}
              </button>
              <button onClick={() => setStep(2)} className="text-sm text-zinc-500 hover:text-zinc-300">
                ← Back to OBS setup
              </button>
            </div>
          )}

          {step === 4 && streamInfo && (
            <div className="space-y-4">
              <GoLivePreview
                title={displayTitle}
                djName={user.displayName}
                playbackUrl={streamInfo.playbackUrl ?? ""}
                rtmpUrl={streamInfo.rtmpUrl}
                ingestKey={streamInfo.ingestKey}
                ingestMode={streamInfo.ingestMode}
                rtmpOnline={rtmpOnline}
                onPublish={publishStream}
                publishing={submitting}
              />
              <div className="flex flex-col items-center gap-2 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={regenerateStreamKey}
                  disabled={submitting}
                  className="text-xs text-zinc-500 hover:text-amber-200 underline underline-offset-2 disabled:opacity-50"
                >
                  {submitting ? "Refreshing key…" : "Generate a new stream key"}
                </button>
                <button
                  type="button"
                  onClick={cancelPreview}
                  disabled={submitting}
                  className="text-xs text-zinc-600 hover:text-zinc-400 disabled:opacity-50"
                >
                  {submitting ? "Discarding…" : "Cancel setup — don't publish"}
                </button>
              </div>
            </div>
          )}

          {step === 5 && streamInfo && (
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-2xl border border-red-500/25 bg-gradient-to-br from-red-500/10 via-[#141416] to-[#53fc18]/5 p-6 text-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.12),transparent_55%)]" />
                <div className="relative">
                  <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/15 px-3 py-1 text-xs font-bold uppercase text-red-300">
                    <Radio className="h-3 w-3 animate-pulse" /> You're live
                  </span>
                  <h2 className="mt-4 text-2xl font-bold">{displayTitle}</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Followers have been notified. Share your booth and open the dashboard to run the set.
                  </p>
                </div>
              </div>

              {rtmpOnline === false && streamInfo.ingestMode === "local" && (
                <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  Streaming server is temporarily unreachable. Confirm OBS is still connected, or see{" "}
                  <Link href="/support" className="text-red-200 underline">
                    live support
                  </Link>
                  .
                </p>
              )}

              <ShareReminderBanner
                username={user.username}
                djName={user.displayName}
                setTitle={displayTitle}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#53fc18] py-3.5 text-sm font-bold text-black"
                >
                  <PartyPopper className="h-4 w-4" />
                  Open dashboard
                </button>
                <Link
                  href={`/stream/${user.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3.5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  View booth
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>

              <div className="flex justify-center">
                <ShareLiveButton
                  username={user.username}
                  djName={user.displayName}
                  setTitle={displayTitle}
                  variant="secondary"
                  label="More share options"
                />
              </div>

              <button
                type="button"
                onClick={endAndRestart}
                disabled={submitting}
                className="w-full rounded-xl border border-white/10 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                {submitting ? "Ending stream…" : "End stream"}
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-zinc-600">
        <Link href="/help/djs" className="inline-flex items-center gap-1 text-zinc-500 hover:text-[#53fc18]">
          <BookOpen className="h-3 w-3" /> Full DJ streaming guide
        </Link>
        <span className="mx-2">·</span>
        <Link href="/dashboard" className="text-zinc-500 hover:text-[#53fc18]">
          Dashboard
        </Link>
      </p>
    </div>
  );
}
