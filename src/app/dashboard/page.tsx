"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Radio,
  Mic,
  Coins,
  TrendingUp,
  Users,
  Trophy,
  ListMusic,
  Archive,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { DROP_TOKEN_SYMBOL } from "@/lib/constants";
import { RequestQueue } from "@/components/RequestQueue";
import { RtmpCredentials } from "@/components/RtmpCredentials";
import { SessionGoals } from "@/components/SessionGoals";
import { SetScorePanel } from "@/components/SetScorePanel";
import { SessionRecapModal, type RecapData } from "@/components/SessionRecapModal";
import { DjSetupChecklist } from "@/components/DjSetupChecklist";
import { ShareLiveButton } from "@/components/ShareLiveButton";
import { PromoteBoothPanel } from "@/components/PromoteBoothPanel";
import { CollabDashboardPanel } from "@/components/CollabDashboardPanel";
import { ShareReminderBanner } from "@/components/ShareReminderBanner";
import { DjWalletBanner } from "@/components/DjWalletBanner";
import { DjDashboardOverview, type DashboardSummary } from "@/components/DjDashboardOverview";

export default function DashboardPage() {
  const { user, refresh } = useAuth();
  const [liveStream, setLiveStream] = useState<{
    id: string;
    title: string;
    ingestKey?: string;
    rtmpUrl?: string;
    ingestMode?: "livepeer" | "local" | "demo";
  } | null>(null);
  const [nowPlaying, setNowPlaying] = useState({ title: "", artist: "", bpm: "" });
  const [nowPlayingSaved, setNowPlayingSaved] = useState(false);
  const [entries, setEntries] = useState<Array<{ amount: number; type: string; createdAt: string }>>([]);

  const [dashboardError, setDashboardError] = useState("");
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [streak, setStreak] = useState(0);
  const [liveActivity, setLiveActivity] = useState<string[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [liveStats, setLiveStats] = useState<{
    peakViewers: number;
    totalTips: number;
    setGrade?: string | null;
    setScore?: number | null;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "dj" && user.role !== "admin") return;
    apiFetch("/api/dashboard/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSummary(d as DashboardSummary));
    apiFetch("/api/schedule")
      .then((r) => r.json())
      .then((d) => setStreak(d.streamStreak ?? 0));
    apiFetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []));
    if (user.liveStream) {
      setLiveStream({
        id: user.liveStream.id,
        title: user.liveStream.title,
        ingestKey: user.liveStream.ingestKey ?? undefined,
        rtmpUrl: user.liveStream.rtmpUrl ?? undefined,
        ingestMode: user.liveStream.ingestMode,
      });
      apiFetch(`/api/now-playing/${user.liveStream.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.nowPlaying) {
            setNowPlaying({
              title: d.nowPlaying.title ?? "",
              artist: d.nowPlaying.artist ?? "",
              bpm: d.nowPlaying.bpm ? String(d.nowPlaying.bpm) : "",
            });
          }
        });
    } else {
      setLiveStream(null);
    }
  }, [user]);

  useEffect(() => {
    const id = liveStream?.id;
    if (!id) return;
    function poll() {
      Promise.all([
        apiFetch(`/api/stream-stats/${id}`).then((r) => r.json()),
        apiFetch(`/api/set-score/${id}`).then((r) => (r.ok ? r.json() : null)),
      ]).then(([stats, scoreData]) => {
        const lines: string[] = [];
        if (stats.totalTips > 0) lines.push(`${stats.totalTips} DROP tipped this set`);
        if (stats.topTippers?.[0]) lines.push(`Top tipper: ${stats.topTippers[0].displayName}`);
        setLiveActivity(lines);
        setLiveStats({
          peakViewers: stats.peakViewers ?? 0,
          totalTips: stats.totalTips ?? 0,
          setGrade: scoreData?.grade ?? null,
          setScore: scoreData?.score ?? null,
        });
      });
    }
    poll();
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [liveStream?.id]);

  async function endStream() {
    setDashboardError("");
    const res = await apiFetch("/api/streams/go-live", { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setDashboardError(data.error ?? "Could not end stream");
      return;
    }
    setLiveStream(null);
    setLiveStats(null);
    if (data.recap) setRecap(data.recap as RecapData);
    await refresh();
    apiFetch("/api/dashboard/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSummary(d as DashboardSummary));
  }

  async function updateNowPlaying(e: React.FormEvent) {
    e.preventDefault();
    if (!liveStream) return;
    setDashboardError("");
    const res = await apiFetch(`/api/now-playing/${liveStream.id}`, {
      method: "POST",
      body: JSON.stringify({
        title: nowPlaying.title,
        artist: nowPlaying.artist,
        bpm: nowPlaying.bpm ? parseInt(nowPlaying.bpm, 10) : undefined,
      }),
    });
    if (res.ok) {
      setNowPlayingSaved(true);
      setTimeout(() => setNowPlayingSaved(false), 2000);
    } else {
      const data = await res.json();
      setDashboardError(data.error ?? "Could not update track");
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Coins className="h-16 w-16 text-[#53fc18] mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">DJ Dashboard</h1>
        <Link href="/login" className="rounded-lg bg-[#53fc18] px-6 py-3 text-sm font-bold text-black inline-block">
          Login
        </Link>
      </div>
    );
  }

  if (user.role !== "dj" && user.role !== "admin") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Coins className="h-16 w-16 text-[#53fc18] mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Fan account</h1>
        <p className="text-zinc-400 mb-6">The DJ dashboard is for streamers. Here&apos;s how to enjoy LiveBooth as a fan:</p>
        <ul className="text-left text-sm text-zinc-400 space-y-2 mb-6 max-w-md mx-auto">
          <li>1. Browse live DJs on Discover and tap to unmute</li>
          <li>2. Follow DJs for go-live alerts</li>
          <li>3. Tip and unlock track IDs from your wallet balance</li>
        </ul>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/guide" className="rounded-lg border border-white/10 px-6 py-3 text-sm text-zinc-300 hover:bg-white/5">
            Fan guide
          </Link>
          <Link href="/wallet" className="rounded-lg bg-[#53fc18] px-6 py-3 text-sm font-bold text-black">
            Open wallet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {dashboardError && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {dashboardError}
        </p>
      )}
      {recap && <SessionRecapModal recap={recap} onClose={() => setRecap(null)} />}
      <DjWalletBanner />
      <DjSetupChecklist isLive={Boolean(liveStream)} />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-zinc-400 text-sm">
            Welcome, {user.displayName}
            {streak > 1 && <span className="text-amber-400 ml-2">🔥 {streak}-week streak</span>}
          </p>
        </div>
        {liveStream ? (
          <button onClick={endStream} className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white">
            <Radio className="h-4 w-4" />
            End Stream
          </button>
        ) : (
          <Link href="/go-live" className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#53fc18] to-[#15CFF4] px-4 py-2 text-sm font-bold text-black">
            <Radio className="h-4 w-4" />
            Go Live
          </Link>
        )}
      </div>

      {summary && (
        <DjDashboardOverview
          summary={summary}
          username={user.username}
          liveStats={
            liveStream
              ? liveStats ?? {
                  peakViewers: summary.liveStream?.peakViewers ?? 0,
                  totalTips: summary.liveStream?.totalTips ?? 0,
                }
              : undefined
          }
          isLive={Boolean(liveStream)}
        />
      )}

      {liveStream && (
        <div className="mb-6 space-y-4">
          <ShareReminderBanner
            username={user.username}
            djName={user.displayName}
            setTitle={liveStream.title}
          />
          <SetScorePanel streamId={liveStream.id} variant="dj" />
          <SessionGoals streamId={liveStream.id} />
          {liveActivity.length > 0 && (
            <div className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2 text-xs text-zinc-400">
              {liveActivity.join(" · ")}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-sm font-medium text-red-400 flex-1 min-w-0 truncate">LIVE — {liveStream.title}</span>
            <ShareLiveButton
              username={user.username}
              djName={user.displayName}
              setTitle={liveStream.title}
              variant="primary"
              label="Share live"
            />
            <Link href={`/stream/${user.username}`} className="text-xs underline text-zinc-400 shrink-0">
              View stream
            </Link>
          </div>

          {liveStream.ingestKey && liveStream.rtmpUrl && (
            <RtmpCredentials
              rtmpUrl={liveStream.rtmpUrl}
              ingestKey={liveStream.ingestKey}
              demoMode={liveStream.ingestMode === "demo"}
            />
          )}

          <div className="rounded-xl border border-white/5 bg-[#141416] p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Mic className="h-4 w-4 text-[#53fc18]" />
              Now Playing (Track ID)
            </h2>
            <p className="text-xs text-zinc-500 mb-3">
              Update each track so fans can unlock the ID — more unlocks mean more DROP for you.
            </p>
            <form onSubmit={updateNowPlaying} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                value={nowPlaying.title}
                onChange={(e) => setNowPlaying({ ...nowPlaying, title: e.target.value })}
                placeholder="Track title"
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
              />
              <input
                value={nowPlaying.artist}
                onChange={(e) => setNowPlaying({ ...nowPlaying, artist: e.target.value })}
                placeholder="Artist"
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
              />
              <button type="submit" className="rounded-lg bg-[#53fc18] py-2 text-sm font-bold text-black">
                {nowPlayingSaved ? "Saved ✓" : "Update Track"}
              </button>
            </form>
          </div>

          <RequestQueue streamId={liveStream.id} />
          <CollabDashboardPanel streamId={liveStream.id} />
          <PromoteBoothPanel streamId={liveStream.id} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-white/5 bg-[#141416] p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#53fc18]" />
            Recent Transactions
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {entries.map((e, i) => (
              <div key={`${e.createdAt}-${e.type}-${i}`} className="flex justify-between text-sm border-b border-white/5 pb-2">
                <span className="text-zinc-400 capitalize">{e.type.replace(/_/g, " ")}</span>
                <span className={e.amount >= 0 ? "text-[#53fc18]" : "text-red-400"}>
                  {e.amount >= 0 ? "+" : ""}{e.amount} {DROP_TOKEN_SYMBOL}
                </span>
              </div>
            ))}
            {entries.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-zinc-500 text-sm">No transactions yet</p>
                <p className="text-xs text-zinc-600 mt-2">
                  Tips, unlocks, and quest rewards show up here when fans engage with your sets.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#141416] p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <ListMusic className="h-4 w-4 text-[#53fc18]" />
            Quick links
          </h2>
          <div className="space-y-2 text-sm">
            <Link
              href={`/stream/${user.username}`}
              className="flex items-center gap-2 text-zinc-400 hover:text-white"
            >
              <Radio className="h-3.5 w-3.5" /> Your booth page
            </Link>
            <Link
              href={`/dj/${user.username}?tab=archive`}
              className="flex items-center gap-2 text-zinc-400 hover:text-white"
            >
              <Archive className="h-3.5 w-3.5" /> Set archive (replays)
            </Link>
            <Link href={`/dj/${user.username}`} className="flex items-center gap-2 text-zinc-400 hover:text-white">
              <Users className="h-3.5 w-3.5" /> Public profile
            </Link>
            <Link href="/achievements" className="flex items-center gap-2 text-zinc-400 hover:text-white">
              <Trophy className="h-3.5 w-3.5" /> Achievements
            </Link>
            <Link href="/wallet" className="flex items-center gap-2 text-zinc-400 hover:text-white">
              <Coins className="h-3.5 w-3.5" /> Wallet & withdrawals
            </Link>
            <Link href="/settings" className="flex items-center gap-2 text-zinc-400 hover:text-white">
              <Mic className="h-3.5 w-3.5" /> Profile settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
