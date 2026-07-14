"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio, Target, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { DROP_TOKEN_SYMBOL, type MemberTier } from "@/lib/constants";
import { MEMBERSHIP_COPY } from "@/lib/staking-ui";
import { MembershipTierPicker } from "@/components/MembershipTierPicker";
import { StakerLeaderboard, type StakerLeaderboardEntry } from "@/components/StakerLeaderboard";

interface Milestone {
  key: string;
  label: string;
  threshold: number;
  current: number;
  progress: number;
  claimed: boolean;
  rewardPool: number;
}

type MyMembership = {
  tier: MemberTier;
  monthlyAmount: number;
  nextBillingAt: string | null;
};

export function StationStakePanel({ slug }: { slug: string }) {
  const { user, refresh } = useAuth();
  const [totalMrr, setTotalMrr] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [myMembership, setMyMembership] = useState<MyMembership | null>(null);
  const [topStakers, setTopStakers] = useState<StakerLeaderboardEntry[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [communityGoal, setCommunityGoal] = useState<{
    label: string;
    currentMrr: number;
    targetMrr: number;
    progress: number;
  } | null>(null);
  const [flagshipDj, setFlagshipDj] = useState<{ username: string; displayName: string } | null>(null);
  const [tier, setTier] = useState<MemberTier>("member");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function load() {
    apiFetch(`/api/stations/${slug}/stake`)
      .then((r) => r.json())
      .then((d) => {
        setTotalMrr(d.totalMrr ?? d.totalStaked ?? 0);
        setMemberCount(d.memberCount ?? d.stakerCount ?? 0);
        setMyMembership(d.myMembership ?? null);
        setMilestones(d.milestones ?? []);
        setFlagshipDj(d.flagshipDj ?? null);
        setTopStakers(d.topStakers ?? []);
        setCommunityGoal(d.communityGoal ?? null);
        if (d.myMembership?.tier) setTier(d.myMembership.tier);
      });
  }

  useEffect(() => {
    load();
  }, [slug]);

  async function join() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    setError("");
    const res = await apiFetch(`/api/stations/${slug}/stake`, {
      method: "POST",
      body: JSON.stringify({ tier }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      await refresh();
      load();
    } else {
      setError(data.error ?? "Could not join");
    }
  }

  async function cancel() {
    setLoading(true);
    const res = await apiFetch(`/api/stations/${slug}/stake`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      setMyMembership(null);
      await refresh();
      load();
    }
  }

  return (
    <div id="membership" className="scroll-mt-24 rounded-xl border border-[#53fc18]/25 bg-gradient-to-br from-[#53fc18]/10 to-cyan-500/5 p-5 space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#53fc18] flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5" />
          Station membership
        </p>
        <h3 className="font-bold text-lg text-white mt-1 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#53fc18]" />
          {MEMBERSHIP_COPY.stationTitle}
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          {memberCount} members · {totalMrr} {DROP_TOKEN_SYMBOL}/mo funds this station
        </p>
        <p className="text-xs text-zinc-400 mt-2">{MEMBERSHIP_COPY.stationHint}</p>
        {flagshipDj && (
          <p className="text-xs text-zinc-400 mt-1">
            Flagship:{" "}
            <Link href={`/dj/${flagshipDj.username}`} className="text-[#53fc18] hover:underline">
              {flagshipDj.displayName}
            </Link>
          </p>
        )}
      </div>

      {communityGoal && (
        <div className="rounded-lg border border-[#53fc18]/30 bg-black/20 p-3">
          <p className="text-[10px] font-bold uppercase text-[#53fc18] flex items-center gap-1">
            <Target className="h-3 w-3" />
            Unlock: {communityGoal.label}
          </p>
          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#53fc18] rounded-full"
              style={{ width: `${communityGoal.progress}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">
            {communityGoal.currentMrr} / {communityGoal.targetMrr} {DROP_TOKEN_SYMBOL} monthly — all members unlock together
          </p>
        </div>
      )}

      {myMembership ? (
        <div className="rounded-lg border border-[#53fc18]/30 bg-[#53fc18]/10 p-3 space-y-2">
          <p className="text-sm text-white">
            Active <span className="font-bold capitalize">{myMembership.tier}</span> —{" "}
            {myMembership.monthlyAmount} {DROP_TOKEN_SYMBOL}/mo
          </p>
          {myMembership.nextBillingAt && (
            <p className="text-xs text-zinc-500">
              Renews {new Date(myMembership.nextBillingAt).toLocaleDateString()}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {myMembership.tier === "member" && (
              <button
                type="button"
                onClick={() => {
                  setTier("supporter");
                  void join();
                }}
                disabled={loading}
                className="text-xs font-semibold text-[#53fc18] hover:underline"
              >
                Upgrade to Supporter
              </button>
            )}
            <button
              type="button"
              onClick={cancel}
              disabled={loading}
              className="text-xs text-zinc-400 hover:text-white underline"
            >
              Cancel membership
            </button>
          </div>
        </div>
      ) : user ? (
        <>
          <MembershipTierPicker selected={tier} onSelect={setTier} variant="station" />
          <button
            type="button"
            onClick={join}
            disabled={loading}
            className="w-full rounded-lg bg-[#53fc18] py-3 text-sm font-bold text-black disabled:opacity-50"
          >
            {loading ? "Joining…" : `Become a ${tier} — supports the station`}
          </button>
        </>
      ) : (
        <p className="text-xs text-zinc-500">
          <Link href="/login" className="text-[#53fc18] hover:underline">
            Sign in
          </Link>{" "}
          to join
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <StakerLeaderboard stakers={topStakers} title="Top station members" emptyLabel="Be the first member!" />
    </div>
  );
}
