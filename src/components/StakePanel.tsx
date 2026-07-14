"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, Users } from "lucide-react";
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

export function StakePanel({ djUsername }: { djUsername: string }) {
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
  const [tier, setTier] = useState<MemberTier>("member");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function load() {
    apiFetch(`/api/stake?djUsername=${encodeURIComponent(djUsername)}`)
      .then((r) => r.json())
      .then((d) => {
        setTotalMrr(d.totalMrr ?? d.totalStaked ?? 0);
        setMemberCount(d.memberCount ?? d.stakerCount ?? 0);
        setMyMembership(d.myMembership ?? null);
        setTopStakers(d.topStakers ?? []);
        setMilestones(d.milestones ?? []);
        setCommunityGoal(d.communityGoal ?? null);
        if (d.myMembership?.tier) setTier(d.myMembership.tier);
      });
  }

  useEffect(() => {
    load();
  }, [djUsername]);

  async function join() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    setError("");
    const res = await apiFetch("/api/stake", {
      method: "POST",
      body: JSON.stringify({ djUsername, tier }),
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
    const res = await apiFetch(`/api/stake?djUsername=${encodeURIComponent(djUsername)}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (res.ok) {
      setMyMembership(null);
      await refresh();
      load();
    }
  }

  return (
    <div id="membership" className="scroll-mt-24 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 mt-6 space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2 text-cyan-300">
          <Users className="h-4 w-4" />
          {MEMBERSHIP_COPY.djTitle}
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          {memberCount} members · {totalMrr} {DROP_TOKEN_SYMBOL}/mo supporting this DJ
        </p>
        <p className="text-xs text-zinc-400 mt-2">{MEMBERSHIP_COPY.djHint}</p>
      </div>

      {communityGoal && (
        <div className="rounded-lg border border-[#53fc18]/20 bg-[#53fc18]/5 p-3">
          <p className="text-[10px] font-bold uppercase text-[#53fc18] flex items-center gap-1">
            <Target className="h-3 w-3" />
            Community goal — {communityGoal.label}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#53fc18] rounded-full"
              style={{ width: `${communityGoal.progress}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">
            {communityGoal.currentMrr} / {communityGoal.targetMrr} {DROP_TOKEN_SYMBOL} monthly member support
          </p>
        </div>
      )}

      {myMembership ? (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 space-y-2">
          <p className="text-sm text-white">
            You&apos;re a{" "}
            <span className="font-bold text-cyan-200 capitalize">{myMembership.tier}</span> —{" "}
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
          <MembershipTierPicker selected={tier} onSelect={setTier} variant="dj" />
          <button
            type="button"
            onClick={join}
            disabled={loading}
            className="w-full rounded-lg bg-[#53fc18] py-2.5 text-sm font-bold text-black disabled:opacity-50"
          >
            {loading ? "Joining…" : `Join as ${tier} — supports the DJ monthly`}
          </button>
        </>
      ) : (
        <p className="text-xs text-zinc-500">
          <Link href="/login" className="text-cyan-300 hover:underline">
            Sign in
          </Link>{" "}
          to become a member
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {milestones.length > 0 && (
        <div className="pt-2 border-t border-cyan-500/10 space-y-2">
          <p className="text-[10px] font-bold uppercase text-zinc-500">Growth milestones</p>
          {milestones.slice(0, 3).map((m) => (
            <div key={m.key}>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className={m.claimed ? "text-[#53fc18]" : "text-zinc-400"}>{m.label}</span>
                <span className="text-zinc-600">{m.rewardPool} {DROP_TOKEN_SYMBOL} pool</span>
              </div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${m.claimed ? "bg-[#53fc18]" : "bg-cyan-500/60"}`}
                  style={{ width: `${m.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <StakerLeaderboard stakers={topStakers} title="Top members" />
    </div>
  );
}
