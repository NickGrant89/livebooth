"use client";

import { useEffect, useState } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { DROP_TOKEN_SYMBOL, QUEST_DAILY_CLEAR_BONUS } from "@/lib/constants";

type QuestRow = {
  id: string;
  label: string;
  target: number;
  progress: number;
  reward: number;
  completed: boolean;
  claimed: boolean;
};

export function QuestPanel() {
  const { user, refresh } = useAuth();
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    if (!user) {
      setLoading(false);
      return;
    }
    const res = await apiFetch("/api/quests");
    if (res.ok) {
      const d = await res.json();
      setQuests(d.quests ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [user]);

  async function claim(questId: string) {
    setClaiming(questId);
    setMsg("");
    const res = await apiFetch("/api/quests", {
      method: "POST",
      body: JSON.stringify({ questId }),
    });
    const d = await res.json();
    if (res.ok) {
      const bonus = d.dailyClearBonus ? ` + ${d.dailyClearBonus} daily clear!` : "";
      setMsg(`+${d.reward} ${DROP_TOKEN_SYMBOL}${bonus}`);
      await load();
      await refresh();
    } else {
      setMsg(d.error ?? "Claim failed");
    }
    setClaiming(null);
  }

  if (!user) {
    return (
      <section className="mx-4 lg:mx-6 mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="text-sm text-zinc-500">
          <Sparkles className="inline h-4 w-4 mr-1 text-[#53fc18]" />
          Sign in to earn daily quests
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="mx-4 lg:mx-6 mt-4 flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </section>
    );
  }

  const allClaimed = quests.length === 3 && quests.every((q) => q.claimed);

  return (
    <section id="quests" className="mx-4 lg:mx-6 mt-4 rounded-xl border border-[#53fc18]/20 bg-[#53fc18]/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-[#53fc18] flex items-center gap-1.5">
          <Sparkles className="h-4 w-4" />
          Today&apos;s quests
        </h2>
        {allClaimed ? (
          <span className="text-xs text-zinc-400">Daily clear!</span>
        ) : (
          <span className="text-xs text-zinc-500">
            Clear all 3 → +{QUEST_DAILY_CLEAR_BONUS} {DROP_TOKEN_SYMBOL}
          </span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {quests.map((q) => {
          const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
          return (
            <div
              key={q.id}
              className="rounded-lg border border-white/[0.08] bg-black/20 p-3 text-sm"
            >
              <p className="font-semibold text-white text-xs">{q.label}</p>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#53fc18] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                {Math.min(q.progress, q.target)}/{q.target} · {q.reward} {DROP_TOKEN_SYMBOL}
              </p>
              {q.claimed ? (
                <p className="text-[10px] text-[#53fc18] mt-2 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Claimed
                </p>
              ) : q.completed ? (
                <button
                  type="button"
                  disabled={claiming === q.id}
                  onClick={() => claim(q.id)}
                  className="mt-2 w-full rounded-md bg-[#53fc18] py-1 text-[10px] font-bold text-black"
                >
                  {claiming === q.id ? "…" : "Claim"}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {msg && <p className="text-xs text-[#53fc18] mt-2">{msg}</p>}
    </section>
  );
}
