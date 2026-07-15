"use client";

import Link from "next/link";
import {
  Calendar,
  Eye,
  Play,
  Radio,
  Trophy,
  Users,
  Coins,
  TrendingUp,
  Link2,
  CheckCircle2,
} from "lucide-react";
import { DAY_LABELS, DROP_TOKEN_SYMBOL, genreLabels } from "@/lib/constants";
import { formatTokens } from "@/context/AuthContext";

export type DashboardSummary = {
  followers: number;
  balance: number;
  totalEarned: number;
  streamStreak: number;
  weeklySlotDay: number | null;
  weeklySlotHour: number | null;
  weeklySlotLabel: string | null;
  achievementCount: number;
  liveStream: {
    id: string;
    title: string;
    peakViewers: number;
    totalTips: number;
    setGrade: string | null;
    setScore: number | null;
  } | null;
  recentSets: Array<{
    id: string;
    title: string;
    genre: string;
    peakViewers: number;
    totalTips: number;
    setGrade: string | null;
    setScore: number | null;
    endedAt: string | null;
    hasReplay: boolean;
    replayState?: "ready" | "processing" | "unavailable";
  }>;
  lastSet: {
    id: string;
    title: string;
    setGrade: string | null;
    setScore: number | null;
    peakViewers: number;
    totalTips: number;
  } | null;
  walletLinked: boolean;
  canReceiveOnChainTips: boolean;
  contractsConfigured: boolean;
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#141416] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${accent ?? "text-[#53fc18]"}`} />
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      </div>
      <p className="text-xl font-bold truncate">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

export function DjDashboardOverview({
  summary,
  username,
  liveStats,
  isLive = false,
}: {
  summary: DashboardSummary;
  username: string;
  liveStats?: { peakViewers: number; totalTips: number; setGrade?: string | null; setScore?: number | null };
  isLive?: boolean;
}) {
  const scheduleSet =
    summary.weeklySlotDay != null && summary.weeklySlotHour != null;

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Followers"
          value={summary.followers.toLocaleString()}
          sub="Fans following you"
        />
        <StatCard
          icon={Coins}
          label="Balance"
          value={formatTokens(summary.balance)}
          sub={`${DROP_TOKEN_SYMBOL} available`}
        />
        <StatCard
          icon={TrendingUp}
          label="Total earned"
          value={Math.round(summary.totalEarned).toLocaleString()}
          sub={`${DROP_TOKEN_SYMBOL} all time`}
        />
        {liveStats ? (
          <StatCard
            icon={Eye}
            label="This set"
            value={`${liveStats.peakViewers.toLocaleString()} peak`}
            sub={`${Math.round(liveStats.totalTips)} ${DROP_TOKEN_SYMBOL} tipped`}
            accent="text-red-400"
          />
        ) : summary.lastSet?.setGrade ? (
          <StatCard
            icon={Trophy}
            label="Last set"
            value={`Grade ${summary.lastSet.setGrade}`}
            sub={
              summary.lastSet.setScore != null
                ? `${summary.lastSet.setScore.toLocaleString()} pts`
                : summary.lastSet.title
            }
            accent="text-[#15CFF4]"
          />
        ) : (
          <StatCard
            icon={Radio}
            label="Last set"
            value="—"
            sub="End a stream to get graded"
          />
        )}
      </div>

      {!isLive && !summary.liveStream && (
        <div className="rounded-xl border border-white/5 bg-gradient-to-br from-[#141416] to-[#0a1628]/40 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg">Ready for your next set?</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {summary.recentSets.length > 0
                ? `You have ${summary.recentSets.length} replay${summary.recentSets.length === 1 ? "" : "s"} in your archive.`
                : "Go live to start building your archive and earning DROP."}
              {summary.streamStreak > 1 && (
                <span className="text-amber-400 ml-1">🔥 {summary.streamStreak}-week streak</span>
              )}
            </p>
          </div>
          <Link
            href="/go-live"
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#53fc18] to-[#15CFF4] px-5 py-2.5 text-sm font-bold text-black"
          >
            <Radio className="h-4 w-4" />
            Go Live
          </Link>
        </div>
      )}

      {!isLive && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-white/5 bg-[#141416] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Play className="h-4 w-4 text-[#53fc18]" />
              Recent sets
            </h2>
            <Link
              href={`/dj/${username}?tab=archive`}
              className="text-xs text-[#53fc18] hover:underline"
            >
              View archive →
            </Link>
          </div>
          {summary.recentSets.length === 0 ? (
            <p className="text-sm text-zinc-500 py-6 text-center">
              No ended sets yet — finish a stream to see replays here.
            </p>
          ) : (
            <ul className="space-y-2">
              {summary.recentSets.map((s) => (
                <li key={s.id}>
                  <Link
                    href={s.hasReplay ? `/vod/${s.id}` : `#`}
                    className={`flex items-center gap-3 rounded-lg border border-white/5 px-3 py-2.5 text-sm transition-colors ${
                      s.hasReplay ? "hover:border-[#53fc18]/30 hover:bg-white/[0.02]" : "opacity-60"
                    }`}
                  >
                    <span className="font-medium truncate flex-1">{s.title}</span>
                    {s.setGrade && (
                      <span className="shrink-0 text-xs font-bold text-[#15CFF4]">{s.setGrade}</span>
                    )}
                    {"replayState" in s && s.replayState === "processing" ? (
                      <span className="shrink-0 text-[10px] font-semibold text-cyan-300">Processing</span>
                    ) : s.hasReplay ? (
                      <span className="shrink-0 text-[10px] font-semibold text-[#53fc18]">Replay</span>
                    ) : null}
                    <span className="shrink-0 text-xs text-zinc-500 hidden sm:inline">
                      {genreLabels[s.genre] ?? s.genre}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-600">
                      {s.peakViewers} peak
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/5 bg-[#141416] p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-[#53fc18]" />
              Weekly slot
            </h2>
            {scheduleSet ? (
              <p className="text-sm text-zinc-300">
                {summary.weeklySlotLabel || "Weekly set"}
                <span className="block text-xs text-zinc-500 mt-1">
                  {DAY_LABELS[summary.weeklySlotDay!]} {summary.weeklySlotHour}:00 UTC
                </span>
              </p>
            ) : (
              <p className="text-xs text-zinc-500">
                Set a recurring slot so fans know when you&apos;re on.
              </p>
            )}
            <Link href="/settings" className="mt-3 inline-block text-xs text-[#53fc18] hover:underline">
              Edit in settings →
            </Link>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#141416] p-5">
            <h2 className="font-semibold mb-2 flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-[#53fc18]" />
              Achievements
            </h2>
            <p className="text-2xl font-bold">{summary.achievementCount}</p>
            <p className="text-xs text-zinc-500 mt-1">Unlocked badges</p>
            <Link href="/achievements" className="mt-3 inline-block text-xs text-[#53fc18] hover:underline">
              View all →
            </Link>
          </div>

          {summary.contractsConfigured && (
            <div
              className={`rounded-xl border p-5 ${
                summary.canReceiveOnChainTips
                  ? "border-[#53fc18]/25 bg-[#53fc18]/5"
                  : "border-[#15CFF4]/25 bg-[#15CFF4]/5"
              }`}
            >
              <h2 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                {summary.canReceiveOnChainTips ? (
                  <CheckCircle2 className="h-4 w-4 text-[#53fc18]" />
                ) : (
                  <Link2 className="h-4 w-4 text-[#15CFF4]" />
                )}
                On-chain tips
              </h2>
              {summary.canReceiveOnChainTips ? (
                <p className="text-xs text-zinc-300">
                  VeWorld linked — fans can tip you on-chain during live sets.
                </p>
              ) : (
                <>
                  <p className="text-xs text-zinc-400">
                    Link VeWorld on your wallet page so fans can tip on-chain while you&apos;re live.
                  </p>
                  <Link
                    href="/wallet"
                    className="mt-3 inline-block text-xs font-bold text-[#041018] bg-[#15CFF4] px-3 py-1.5 rounded-lg hover:bg-[#3dd9ff]"
                  >
                    Link wallet →
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
