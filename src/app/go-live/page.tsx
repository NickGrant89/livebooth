"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Radio, Mic, Headphones, ChevronRight, BookOpen } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { GenrePicker } from "@/components/GenrePicker";
import { GoLivePreview } from "@/components/GoLivePreview";
import { DJ_OBS_STEPS, GO_LIVE_STEPS } from "@/lib/guidance";
import { ShareLiveButton } from "@/components/ShareLiveButton";
import { ShareReminderBanner } from "@/components/ShareReminderBanner";

type StreamInfo = {
  id: string;
  rtmpUrl: string;
  ingestKey: string;
  playbackUrl?: string | null;
  title?: string;
  status?: string;
  ingestMode?: "livepeer" | "local" | "demo";
};

export default function GoLivePage() {
  const { user, refresh, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("live-band");
  const [bpmRange, setBpmRange] = useState("");
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rtmpOnline, setRtmpOnline] = useState<boolean | null>(null);

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
    const res = await apiFetch("/api/streams/go-live", { method: "DELETE" });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not end stream");
      return;
    }
    setStreamInfo(null);
    setStep(1);
    setTitle("");
    await refresh();
  }

  async function startStream() {
    setSubmitting(true);
    setError("");
    const res = await apiFetch("/api/streams/go-live", {
      method: "POST",
      body: JSON.stringify({ title, genre, bpmRange: bpmRange || undefined }),
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
      <div className="mx-auto max-w-md px-4 py-16 text-center text-zinc-400">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-zinc-400 mb-4">Login as a DJ to go live</p>
        <Link href="/login" className="rounded-lg bg-[#53fc18] px-6 py-3 text-sm font-bold text-black">
          Login
        </Link>
      </div>
    );
  }

  if (user.role !== "dj" && user.role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-zinc-400 mb-4">You need a DJ account to go live.</p>
        <Link href="/signup" className="rounded-lg bg-[#53fc18] px-6 py-3 text-sm font-bold text-black">
          Sign up as DJ
        </Link>
      </div>
    );
  }

  const displayTitle = streamInfo?.title || title || user.liveStream?.title || "Live set";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2 text-center">Go Live</h1>
      <p className="text-zinc-400 text-center mb-2">Set up your stream and start earning DROP</p>
      <p className="text-center text-xs text-zinc-600 mb-6">
        <Link href="/help/djs" className="text-[#53fc18] hover:underline inline-flex items-center gap-1">
          <BookOpen className="h-3 w-3" /> Full DJ guide
        </Link>
      </p>

      <div className="flex justify-between mb-6 px-2">
        {GO_LIVE_STEPS.map((s, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={s.label} className="flex-1 text-center px-1">
              <div
                className={`mx-auto h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                  active
                    ? "bg-[#53fc18] text-black"
                    : done
                      ? "bg-[#53fc18]/30 text-[#53fc18]"
                      : "bg-white/10 text-zinc-500"
                }`}
              >
                {done ? "✓" : n}
              </div>
              <p className={`text-[10px] font-medium ${active ? "text-white" : "text-zinc-500"}`}>
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-zinc-500 text-center mb-6">
        {GO_LIVE_STEPS[step - 1]?.hint}
      </p>

      <div className="rounded-2xl border border-white/5 bg-[#141416] p-6">
        {existingLive && step < 4 && (
          <div className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 space-y-3">
            <p className="text-sm text-amber-100">
              You already have an active stream:{" "}
              <strong className="text-white">{existingLive.title}</strong>
              {existingLive.status === "preparing" && (
                <span className="text-amber-200/80"> (preview — not public yet)</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
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
                className="rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/30 disabled:opacity-50"
              >
                {submitting ? "Ending…" : "End stream & start new"}
              </button>
            </div>
          </div>
        )}

        {error && step !== 3 && (
          <p className="mb-4 text-red-400 text-sm text-center">{error}</p>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Mic className="h-5 w-5 text-[#53fc18]" /> Stream Details
            </h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Set title"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white"
            />
            <label className="block text-xs text-zinc-500 mb-2">Category / genre</label>
            <GenrePicker value={genre} onChange={setGenre} />
            <select
              value={bpmRange}
              onChange={(e) => setBpmRange(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white text-sm"
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
              className="w-full rounded-lg bg-white/10 py-3 text-sm font-medium disabled:opacity-40"
            >
              Next: Audio Setup →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Headphones className="h-5 w-5 text-[#53fc18]" /> OBS / RTMP Setup
            </h2>
            <p className="text-sm text-zinc-500">You&apos;ll get your personal stream key on the next step. Set up OBS first:</p>
            <ol className="rounded-xl bg-white/5 p-4 text-sm text-zinc-400 space-y-2 list-decimal list-inside">
              {DJ_OBS_STEPS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
            {rtmpOnline === false && (
              <p className="text-xs text-red-400">
                Streaming server unreachable — check{" "}
                <Link href="/support" className="text-red-300 underline">live support chat</Link> or try again in a few minutes.
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 rounded-lg bg-white/5 py-3 text-sm">← Back</button>
              <button onClick={() => setStep(3)} className="flex-1 rounded-lg bg-white/10 py-3 text-sm">Next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 text-center">
            <Radio className="h-16 w-16 text-[#53fc18] mx-auto animate-pulse" />
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-zinc-400 capitalize">{genre.replace("-", " ")}</p>
            <p className="text-xs text-zinc-500">
              Creates your stream key. Fans won&apos;t be notified until you finish the preview step.
            </p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={startStream}
              disabled={submitting}
              className="w-full rounded-lg bg-gradient-to-r from-[#53fc18] to-[#15CFF4] py-3 text-sm font-bold text-black disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Get stream key →"}
            </button>
            <button onClick={() => setStep(2)} className="text-sm text-zinc-500">← Back</button>
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
            <button
              type="button"
              onClick={regenerateStreamKey}
              disabled={submitting}
              className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 py-2.5 text-sm text-amber-200 hover:bg-amber-500/15 disabled:opacity-50"
            >
              {submitting ? "Refreshing key…" : "OBS keeps disconnecting? Generate new stream key"}
            </button>
            <button
              type="button"
              onClick={cancelPreview}
              disabled={submitting}
              className="w-full rounded-lg bg-white/5 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-50"
            >
              {submitting ? "Discarding…" : "Cancel setup — don\u2019t publish"}
            </button>
          </div>
        )}

        {step === 5 && streamInfo && (
          <div className="space-y-5">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-red-500/20 border border-red-500/30 px-3 py-1 text-xs font-bold text-red-400 uppercase">
                <Radio className="h-3 w-3 animate-pulse" /> You are live
              </span>
              <h2 className="text-xl font-bold mt-3">{displayTitle}</h2>
              <p className="text-sm text-zinc-400 mt-1">Followers have been notified. Share your booth link.</p>
            </div>
            {rtmpOnline === false && streamInfo.ingestMode === "local" && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                Streaming server is temporarily unreachable. Confirm OBS is set to{" "}
                <code className="rounded bg-black/30 px-1 font-mono text-xs">rtmp://rtmp.livebooth.uk:1935/live</code>{" "}
                and your stream key matches Go Live. See{" "}
                <Link href="/support" className="text-red-200 underline">live support chat</Link> if this persists.
              </p>
            )}
            <ShareReminderBanner
              username={user.username}
              djName={user.displayName}
              setTitle={displayTitle}
            />
            <div className="flex justify-center w-full">
              <ShareLiveButton
                username={user.username}
                djName={user.displayName}
                setTitle={displayTitle}
                variant="secondary"
                label="More share options"
              />
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full flex items-center justify-center gap-2 rounded-lg btn-primary py-3 text-sm font-bold"
            >
              Open Dashboard <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={endAndRestart}
              disabled={submitting}
              className="w-full rounded-lg bg-white/5 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-50"
            >
              {submitting ? "Ending stream…" : "End stream"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
