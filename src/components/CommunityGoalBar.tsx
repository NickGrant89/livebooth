"use client";

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";
import { DROP_TOKEN_SYMBOL } from "@/lib/constants";

type GoalData = {
  label: string;
  description: string;
  targetMrr: number;
  currentMrr: number;
  memberCount: number;
  progress: number;
  kind?: string;
};

export function CommunityGoalBar({ streamId }: { streamId: string }) {
  const [goal, setGoal] = useState<GoalData | null>(null);

  useEffect(() => {
    apiFetch(`/api/streams/${streamId}/member-goal`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setGoal(d));
  }, [streamId]);

  if (!goal) return null;

  const unlocked = goal.progress >= 100;

  return (
    <div className="mt-3 rounded-xl border border-[#53fc18]/20 bg-[#53fc18]/5 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-[#53fc18] flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            Member community goal
          </p>
          <p className="text-sm font-semibold text-white mt-1">{goal.label}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{goal.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-[#53fc18]">
            {goal.currentMrr} / {goal.targetMrr} {DROP_TOKEN_SYMBOL}
          </p>
          <p className="text-[10px] text-zinc-500">{goal.memberCount} members</p>
        </div>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${unlocked ? "bg-[#53fc18]" : "bg-[#53fc18]/70"}`}
          style={{ width: `${goal.progress}%` }}
        />
      </div>
      {unlocked && (
        <p className="text-xs text-[#53fc18] mt-2 font-medium">Goal unlocked — thank you, members!</p>
      )}
    </div>
  );
}
