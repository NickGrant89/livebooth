"use client";

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";

interface Goal {
  label: string;
  current: number;
  target: number;
  unit?: string;
}

export function SessionGoals({ streamId }: { streamId?: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    if (!streamId) return;
    function load() {
      apiFetch(`/api/session-goals?streamId=${streamId}`)
        .then((r) => r.json())
        .then((d) => setGoals(d.goals ?? []));
    }
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [streamId]);

  if (!streamId || goals.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#53fc18]/20 bg-[#53fc18]/5 p-4 mb-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-[#53fc18]" />
        Session goals
      </h3>
      <div className="space-y-3">
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.current / g.target) * 100));
          return (
            <div key={g.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400">{g.label}</span>
                <span className="text-zinc-300 font-mono">
                  {Math.round(g.current)}{g.unit ? ` ${g.unit}` : ""} / {g.target}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#53fc18] to-[#15CFF4] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
