"use client";

import { useState } from "react";
import { Check, Lock, Sparkles } from "lucide-react";
import { tierColors } from "@/lib/constants";
import { useAuth, formatTokens } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { useOnChainDrop } from "@/hooks/useOnChainDrop";
import { onChainFeaturesAvailable } from "@/lib/web3/contracts";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  rewardTokens: number;
  requirement: string;
  progress: number;
  unlocked: boolean;
  claimed: boolean;
}

export function AchievementCard({ achievement }: { achievement: Achievement }) {
  const { user, refresh } = useAuth();
  const { isConnected, claimAchievementOnChain, isPending } = useOnChainDrop();
  const [justClaimed, setJustClaimed] = useState(false);
  const [error, setError] = useState("");

  async function handleClaimInternal() {
    const res = await apiFetch("/api/achievements", {
      method: "POST",
      body: JSON.stringify({ achievementId: achievement.id }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Claim failed");
      return;
    }
    setJustClaimed(true);
    await refresh();
    setTimeout(() => setJustClaimed(false), 2000);
  }

  async function handleClaimOnChain() {
    setError("");
    const signRes = await apiFetch("/api/achievements/claim-sign", {
      method: "POST",
      body: JSON.stringify({ achievementId: achievement.id }),
    });
    const signData = await signRes.json();
    if (!signRes.ok) {
      if (signRes.status === 503) {
        return handleClaimInternal();
      }
      setError(signData.error ?? "Could not sign claim");
      return;
    }

    const txHash = await claimAchievementOnChain(
      signData.claimId as `0x${string}`,
      signData.amount,
      BigInt(signData.deadline),
      signData.signature as `0x${string}`,
    );

    const confirmRes = await apiFetch("/api/achievements/on-chain", {
      method: "POST",
      body: JSON.stringify({ achievementId: achievement.id, txHash }),
    });
    if (!confirmRes.ok) {
      const data = await confirmRes.json();
      setError(data.error ?? "Claim recorded failed");
      return;
    }

    setJustClaimed(true);
    await refresh();
    setTimeout(() => setJustClaimed(false), 2000);
  }

  async function handleClaim() {
    setError("");
    const useChain =
      onChainFeaturesAvailable() && isConnected && user?.walletAddress?.startsWith("0x");

    try {
      if (useChain) await handleClaimOnChain();
      else await handleClaimInternal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim failed");
    }
  }

  const progressPct = Math.round(achievement.progress * 100);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 ${
        achievement.unlocked
          ? "border-white/10 bg-[#141416]"
          : "border-white/5 bg-[#0d0d0f] opacity-70"
      } ${justClaimed ? "ring-2 ring-[#53fc18]" : ""}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-2xl ${tierColors[achievement.tier] ?? ""} ${achievement.unlocked ? "" : "grayscale"}`}
        >
          {achievement.unlocked ? achievement.icon : <Lock className="h-5 w-5 text-white/50" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white">{achievement.name}</h3>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-white/10">
              {achievement.tier}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">{achievement.description}</p>
          {!achievement.unlocked && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#53fc18] transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-zinc-600 mt-1">{progressPct}% — {achievement.requirement}</p>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#53fc18]">
              +{formatTokens(achievement.rewardTokens)}
            </span>
            {achievement.unlocked && !achievement.claimed && user && (
              <button
                onClick={handleClaim}
                disabled={isPending}
                className="flex items-center gap-1 rounded-lg bg-[#53fc18] px-3 py-1 text-xs font-bold text-black disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3" />
                {isPending ? "..." : onChainFeaturesAvailable() && isConnected ? "Claim on-chain" : "Claim"}
              </button>
            )}
            {achievement.claimed && (
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Check className="h-3 w-3 text-[#53fc18]" />
                Claimed
              </span>
            )}
          </div>
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}
