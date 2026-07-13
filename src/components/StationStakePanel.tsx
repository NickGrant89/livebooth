"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Target, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { MIN_STAKE_AMOUNT, DROP_TOKEN_SYMBOL, STAKER_PERKS } from "@/lib/constants";
import { STAKING_COPY } from "@/lib/staking-ui";
import { StakerLeaderboard, type StakerLeaderboardEntry } from "@/components/StakerLeaderboard";
import { estimateProportionalShare } from "@/lib/staking-rewards";

interface Milestone {
  key: string;
  label: string;
  threshold: number;
  current: number;
  progress: number;
  claimed: boolean;
  rewardPool: number;
}

export function StationStakePanel({ slug }: { slug: string }) {
  const { user, refresh } = useAuth();
  const [totalStaked, setTotalStaked] = useState(0);
  const [stakerCount, setStakerCount] = useState(0);
  const [myStake, setMyStake] = useState<number | null>(null);
  const [topStakers, setTopStakers] = useState<StakerLeaderboardEntry[]>([]);
  const [amount, setAmount] = useState(String(MIN_STAKE_AMOUNT));
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [flagshipDj, setFlagshipDj] = useState<{ username: string; displayName: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function load() {
    apiFetch(`/api/stations/${slug}/stake`)
      .then((r) => r.json())
      .then((d) => {
        setTotalStaked(d.totalStaked ?? 0);
        setStakerCount(d.stakerCount ?? 0);
        setMyStake(d.myStake?.amount ?? null);
        setMilestones(d.milestones ?? []);
        setFlagshipDj(d.flagshipDj ?? null);
        setTopStakers(d.topStakers ?? []);
      });
  }

  useEffect(() => {
    load();
  }, [slug]);

  async function stake() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    setError("");
    const res = await apiFetch(`/api/stations/${slug}/stake`, {
      method: "POST",
      body: JSON.stringify({ amount: parseInt(amount, 10) }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMyStake(parseInt(amount, 10));
      await refresh();
      load();
    } else {
      setError(data.error ?? "Stake failed");
    }
  }

  async function unstake() {
    setLoading(true);
    const res = await apiFetch(`/api/stations/${slug}/stake`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      setMyStake(null);
      await refresh();
      load();
    }
  }

  return (
    <div id="stake" className="scroll-mt-24 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2 text-cyan-300">
          <TrendingUp className="h-4 w-4" />
          {STAKING_COPY.stationTitle}
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          {stakerCount} members · {totalStaked} {DROP_TOKEN_SYMBOL} pooled
        </p>
        <p className="text-xs text-zinc-400 mt-2">{STAKING_COPY.stationHint}</p>
        {flagshipDj && (
          <p className="text-xs text-zinc-400 mt-1">
            Flagship show:{" "}
            <Link href={`/dj/${flagshipDj.username}`} className="text-cyan-300 hover:underline">
              {flagshipDj.displayName}
            </Link>
          </p>
        )}
      </div>

      <ul className="grid sm:grid-cols-2 gap-1.5">
        {STAKER_PERKS.map((perk) => (
          <li key={perk} className="flex items-start gap-1.5 text-[11px] text-zinc-400">
            <Check className="h-3 w-3 shrink-0 text-[#53fc18] mt-0.5" />
            {perk}
          </li>
        ))}
      </ul>

      {myStake != null ? (
        <div className="flex items-center justify-between">
          <p className="text-sm">
            Your stake:{" "}
            <span className="text-cyan-300 font-bold">
              {myStake} {DROP_TOKEN_SYMBOL}
            </span>
          </p>
          <button
            type="button"
            onClick={unstake}
            disabled={loading}
            className="text-xs text-zinc-400 hover:text-white underline"
          >
            Unstake
          </button>
        </div>
      ) : user ? (
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={MIN_STAKE_AMOUNT}
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={stake}
            disabled={loading}
            className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-4 py-2 text-sm font-bold text-cyan-200 disabled:opacity-50"
          >
            Become a member
          </button>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Sign in to become a station member</p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {milestones.length > 0 && (
        <div className="pt-2 border-t border-cyan-500/10 space-y-2">
          <p className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1">
            <Target className="h-3 w-3" />
            Community milestones
          </p>
          {milestones.map((m) => {
            const yourShare =
              myStake != null
                ? estimateProportionalShare(myStake, totalStaked || myStake, m.rewardPool)
                : null;
            return (
              <div key={m.key}>
                <div className="flex justify-between text-[11px] mb-0.5 gap-2">
                  <span className={m.claimed ? "text-[#53fc18]" : "text-zinc-400"}>
                    {m.label} {m.claimed && "✓"}
                  </span>
                  <span className="text-zinc-600 shrink-0 text-right">
                    {m.rewardPool} {DROP_TOKEN_SYMBOL} pool
                    {yourShare != null && !m.claimed && (
                      <span className="block text-cyan-400/80">~{yourShare} for you</span>
                    )}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.claimed ? "bg-[#53fc18]" : "bg-cyan-500/60"}`}
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StakerLeaderboard stakers={topStakers} title="Top members" emptyLabel="No members yet — be the first!" />
    </div>
  );
}
