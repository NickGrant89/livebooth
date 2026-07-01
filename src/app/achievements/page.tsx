"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { AchievementCard } from "@/components/AchievementCard";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { ACHIEVEMENTS, DROP_TOKEN_SYMBOL } from "@/lib/constants";

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

export default function AchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAchievements(
        ACHIEVEMENTS.map((a) => ({
          ...a,
          progress: 0,
          unlocked: false,
          claimed: false,
        })),
      );
      setLoading(false);
      return;
    }
    apiFetch("/api/achievements")
      .then((r) => r.json())
      .then((d) => setAchievements(d.achievements ?? []))
      .finally(() => setLoading(false));
  }, [user]);

  const unlocked = achievements.filter((a) => a.unlocked).length;
  const claimable = achievements.filter((a) => a.unlocked && !a.claimed).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <Trophy className="h-8 w-8 text-[#53fc18]" />
        <h1 className="text-3xl font-bold">Achievements</h1>
      </div>
      <p className="text-zinc-400 mb-6">
        Complete milestones to earn {DROP_TOKEN_SYMBOL}. Auto-tracked from your streams, tips, and activity.
      </p>

      {!user && (
        <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3 mb-6 text-sm text-zinc-400">
          Preview below — <Link href="/login" className="text-[#53fc18] hover:underline">login</Link> to track progress and claim rewards.
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 max-w-md mb-8">
        <div className="rounded-xl bg-white/5 p-4 text-center">
          <div className="text-2xl font-bold text-[#53fc18]">{unlocked}</div>
          <div className="text-xs text-zinc-500">Unlocked</div>
        </div>
        <div className="rounded-xl bg-white/5 p-4 text-center">
          <div className="text-2xl font-bold">{achievements.length}</div>
          <div className="text-xs text-zinc-500">Total</div>
        </div>
        <div className="rounded-xl bg-white/5 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{claimable}</div>
          <div className="text-xs text-zinc-500">Claimable</div>
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : (
        <div className="space-y-3">
          {achievements.map((a) => (
            <AchievementCard key={a.id} achievement={a} />
          ))}
        </div>
      )}
    </div>
  );
}
