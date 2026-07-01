"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";

type ScoreData = {
  score: number;
  gradePace: string;
  par: number;
  questContributions: number;
  breakdown: {
    tips: number;
    unlocks: number;
    quests: number;
  };
};

export function SetScorePanel({
  streamId,
  variant = "fan",
}: {
  streamId: string;
  variant?: "fan" | "dj";
}) {
  const [data, setData] = useState<ScoreData | null>(null);

  useEffect(() => {
    function load() {
      apiFetch(`/api/set-score/${streamId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setData(d));
    }
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [streamId]);

  if (!data) return null;

  const pct = data.par > 0 ? Math.min(100, Math.round((data.score / (data.par * 1.15)) * 100)) : 50;

  return (
    <div className="rounded-xl border border-[#15CFF4]/20 bg-[#15CFF4]/5 p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[#15CFF4]" />
          {variant === "dj" ? "Booth score" : "Set score"}
        </h3>
        <span className="text-lg font-black text-gradient tabular-nums">
          {data.score.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#15CFF4] to-[#53fc18] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-zinc-400">
        {data.gradePace}
        {data.questContributions > 0 && (
          <span className="text-[#53fc18]">
            {" "}
            · {data.questContributions} quest{data.questContributions === 1 ? "" : "s"} cleared mid-set
          </span>
        )}
      </p>
      {variant === "fan" && (
        <p className="text-[10px] text-zinc-500 mt-1">Tip or unlock to push the score</p>
      )}
      {variant === "dj" && (
        <p className="text-[10px] text-zinc-500 mt-1 font-mono">
          Tips {data.breakdown.tips} · Unlocks {data.breakdown.unlocks} · Quests {data.breakdown.quests}
        </p>
      )}
    </div>
  );
}
