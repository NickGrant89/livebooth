"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";

export interface UnlockedAchievement {
  id: string;
  name: string;
  icon: string;
  rewardTokens: number;
}

export function AchievementToasts({
  unlocks,
  onDismiss,
}: {
  unlocks: UnlockedAchievement[];
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState<UnlockedAchievement | null>(null);

  useEffect(() => {
    if (unlocks.length > 0 && !visible) {
      setVisible(unlocks[0]);
      const t = setTimeout(() => {
        setVisible(null);
        onDismiss();
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [unlocks, visible, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[100] animate-in slide-in-from-right duration-300">
      <div className="rounded-xl border border-[#53fc18]/40 bg-[#141416] px-4 py-3 shadow-2xl shadow-[#53fc18]/10 max-w-xs">
        <p className="text-[10px] uppercase tracking-widest text-[#53fc18] font-bold flex items-center gap-1">
          <Trophy className="h-3 w-3" /> Achievement unlocked
        </p>
        <p className="text-2xl mt-1">{visible.icon}</p>
        <p className="font-bold text-white">{visible.name}</p>
        <p className="text-xs text-zinc-400">Claim {visible.rewardTokens} DROP on Achievements</p>
      </div>
    </div>
  );
}

export function useAchievementUnlocks() {
  const [queue, setQueue] = useState<UnlockedAchievement[]>([]);

  function pushUnlocks(unlocks: UnlockedAchievement[]) {
    if (unlocks.length) setQueue((q) => [...q, ...unlocks]);
  }

  function dismissOne() {
    setQueue((q) => q.slice(1));
  }

  return { queue, pushUnlocks, dismissOne };
}
