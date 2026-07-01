"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Users,
  Coins,
  Radio,
  TrendingUp,
  Heart,
  Crown,
  Medal,
  Award,
} from "lucide-react";
import type { LeaderboardEntry } from "@/lib/leaderboard";

type TabId =
  | "earned"
  | "followers"
  | "tips"
  | "viewers"
  | "fans"
  | "stations"
  | "sets";

type StationSubTab = "earned" | "followers";

interface LeaderboardData {
  summary?: {
    liveDjs: number;
    totalDjs: number;
    totalStations: number;
    topSetGrade: string | null;
  };
  djs: {
    earned: LeaderboardEntry[];
    followers: LeaderboardEntry[];
    tips: LeaderboardEntry[];
    viewers: LeaderboardEntry[];
  };
  fans: { tippers: LeaderboardEntry[] };
  stations: {
    earned: LeaderboardEntry[];
    followers: LeaderboardEntry[];
  };
  sets: LeaderboardEntry[];
}

const TABS: { id: TabId; label: string; icon: typeof Trophy; group: string }[] = [
  { id: "earned", label: "Top earners", icon: Coins, group: "DJs" },
  { id: "tips", label: "Most tipped", icon: Heart, group: "DJs" },
  { id: "followers", label: "Most followed", icon: Users, group: "DJs" },
  { id: "viewers", label: "Peak viewers", icon: Radio, group: "DJs" },
  { id: "sets", label: "Best sets", icon: Award, group: "Sets" },
  { id: "fans", label: "Top tippers", icon: TrendingUp, group: "Fans" },
  { id: "stations", label: "Stations", icon: Trophy, group: "Radio" },
];

function rankStyle(rank: number) {
  if (rank === 1) return "from-yellow-400 to-amber-600 text-black";
  if (rank === 2) return "from-slate-300 to-slate-500 text-black";
  if (rank === 3) return "from-amber-700 to-amber-900 text-white";
  return "from-white/10 to-white/5 text-zinc-400";
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br shrink-0 ${rankStyle(rank)}`}
      >
        {rank === 1 ? <Crown className="h-4 w-4" /> : <Medal className="h-4 w-4" />}
      </div>
    );
  }
  return (
    <span className="text-lg font-bold text-zinc-600 w-9 text-center shrink-0">#{rank}</span>
  );
}

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const top = entries.slice(0, 3);
  if (top.length === 0) return null;

  const order = [top[1], top[0], top[2]].filter(Boolean);
  const heights = ["h-24", "h-32", "h-20"];

  return (
    <div className="flex items-end justify-center gap-3 mb-8 px-2">
      {order.map((entry, i) => {
        const actualRank = entry.rank;
        const height = heights[i];
        return (
          <Link
            key={`${entry.username}-${entry.rank}`}
            href={entry.href}
            className="flex flex-col items-center flex-1 max-w-[120px] group"
          >
            <div className="relative mb-2">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-bold text-black ring-2 ${
                  actualRank === 1
                    ? "from-yellow-400 to-amber-500 ring-yellow-400/50"
                    : actualRank === 2
                      ? "from-slate-300 to-slate-400 ring-slate-400/50"
                      : "from-amber-700 to-amber-800 ring-amber-700/50 text-white"
                } group-hover:scale-105 transition-transform`}
              >
                {entry.avatar || entry.displayName.slice(0, 2)}
              </div>
              {entry.isLive && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-[#0a0a0c] animate-pulse" />
              )}
            </div>
            <p className="text-xs font-bold text-white text-center truncate w-full group-hover:text-[#53fc18]">
              {entry.displayName}
            </p>
            <p className="text-[10px] text-[#53fc18] font-mono font-bold mt-0.5">
              {entry.value.toLocaleString()}
            </p>
            <div
              className={`w-full ${height} mt-2 rounded-t-xl bg-gradient-to-t from-[#53fc18]/20 to-[#53fc18]/5 border border-[#53fc18]/20 border-b-0 flex items-end justify-center pb-2`}
            >
              <span className="text-2xl font-black text-[#53fc18]/40">#{actualRank}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function LeaderboardList({ entries, emptyMessage }: { entries: LeaderboardEntry[]; emptyMessage: string }) {
  if (entries.length === 0) {
    return (
      <p className="text-center text-zinc-500 py-12 text-sm">{emptyMessage}</p>
    );
  }

  const rest = entries.length > 3 ? entries.slice(3) : [];

  return (
    <div className="space-y-2">
      {rest.map((entry) => (
        <Link
          key={`${entry.username}-${entry.rank}`}
          href={entry.href}
          className="flex items-center gap-4 rounded-xl border border-white/5 bg-[#141416] px-4 py-3 hover:border-[#53fc18]/25 hover:bg-[#53fc18]/[0.03] transition-all group"
        >
          <RankBadge rank={entry.rank} />
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#53fc18] to-[#00d4aa] text-sm font-bold text-black group-hover:scale-105 transition-transform">
              {entry.avatar || entry.displayName.slice(0, 2)}
            </div>
            {entry.isLive && (
              <span className="absolute -bottom-0.5 -right-0.5 rounded px-1 py-px text-[8px] font-bold bg-red-500 text-white">
                LIVE
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate group-hover:text-[#53fc18] transition-colors">
              {entry.displayName}
            </p>
            {entry.meta && <p className="text-xs text-zinc-500 truncate">{entry.meta}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-[#53fc18] font-mono">{entry.value.toLocaleString()}</p>
            <p className="text-[10px] text-zinc-600 uppercase">{entry.valueLabel}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

const EMPTY_MESSAGES: Partial<Record<TabId, string>> = {
  earned: "No earnings yet — go live and collect tips.",
  tips: "No tips yet — fans tip from the stream sidebar.",
  followers: "No followers yet — share your DJ profile.",
  viewers: "No peak viewers recorded — stream to climb this board.",
  fans: "No fan tippers yet.",
  stations: "No station stats yet — tune in at /station/kxradio.",
  sets: "No graded sets yet — end a live set to earn a letter grade.",
};

export function LeaderboardView({ data }: { data: LeaderboardData }) {
  const [tab, setTab] = useState<TabId>("earned");
  const [stationSubTab, setStationSubTab] = useState<StationSubTab>("earned");

  function getEntries(): LeaderboardEntry[] {
    switch (tab) {
      case "earned":
        return data.djs.earned;
      case "followers":
        return data.djs.followers;
      case "tips":
        return data.djs.tips;
      case "viewers":
        return data.djs.viewers;
      case "fans":
        return data.fans.tippers;
      case "stations":
        return stationSubTab === "earned" ? data.stations.earned : data.stations.followers;
      case "sets":
        return data.sets;
      default:
        return [];
    }
  }

  const entries = getEntries();
  const activeTab = TABS.find((t) => t.id === tab)!;
  const summary = data.summary;

  return (
    <div>
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {[
            { label: "Live DJs", value: summary.liveDjs },
            { label: "DJs ranked", value: summary.totalDjs },
            { label: "Stations", value: summary.totalStations },
            { label: "Top grade", value: summary.topSetGrade ?? "—" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-center"
            >
              <p className="text-lg font-bold font-mono text-white">{value}</p>
              <p className="text-[10px] text-zinc-500 uppercase">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                active
                  ? "bg-[#53fc18]/15 border border-[#53fc18]/40 text-[#53fc18]"
                  : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "stations" && (
        <div className="flex gap-2 mb-4">
          {(["earned", "followers"] as const).map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setStationSubTab(sub)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                stationSubTab === sub
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {sub === "earned" ? "DROP on shows" : "Followers"}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-500 mb-4">
        {activeTab.group} · ranked by {entries[0]?.valueLabel ?? activeTab.label.toLowerCase()}
      </p>

      <Podium entries={entries} />
      <LeaderboardList
        entries={entries}
        emptyMessage={EMPTY_MESSAGES[tab] ?? "No rankings yet."}
      />
    </div>
  );
}
