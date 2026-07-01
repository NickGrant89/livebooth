"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Check, Loader2, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { DROP_TOKEN_SYMBOL } from "@/lib/constants";

type QuestRow = {
  id: string;
  label: string;
  target: number;
  progress: number;
  reward: number;
  completed: boolean;
  claimed: boolean;
};

export function QuestStreamChip({ streamId }: { streamId?: string }) {
  const { user, refresh } = useAuth();
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
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
      body: JSON.stringify({ questId, ...(streamId ? { streamId } : {}) }),
    });
    const d = await res.json();
    if (res.ok) {
      setMsg(`+${d.reward} ${DROP_TOKEN_SYMBOL}`);
      await load();
      await refresh();
    } else {
      setMsg(d.error ?? "Claim failed");
    }
    setClaiming(null);
  }

  if (!user) return null;
  if (loading) {
    return (
      <div className="mx-3 sm:mx-4 lg:mx-5 mt-2 flex items-center gap-2 text-xs text-zinc-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading quests…
      </div>
    );
  }
  if (quests.length === 0) return null;

  const claimed = quests.filter((q) => q.claimed).length;
  const claimable = quests.filter((q) => q.completed && !q.claimed);
  const next = quests.find((q) => !q.claimed && !q.completed);

  return (
    <div className="mx-3 sm:mx-4 lg:mx-5 mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-[#53fc18]/25 bg-[#53fc18]/5 px-3 py-2 text-left hover:bg-[#53fc18]/10 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#53fc18] min-w-0">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            Quests {claimed}/{quests.length}
            {claimable.length > 0
              ? ` · Claim ${claimable.reduce((s, q) => s + q.reward, 0)} ${DROP_TOKEN_SYMBOL}`
              : next
                ? ` · ${next.label} (${Math.min(next.progress, next.target)}/${next.target})`
                : " · Daily clear!"}
          </span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-1 rounded-lg border border-white/[0.08] bg-[#0a0a0c] p-2 space-y-1.5">
          {quests.map((q) => {
            const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
            return (
              <div key={q.id} className="rounded-md bg-white/[0.03] px-2.5 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-zinc-200 truncate">{q.label}</span>
                  <span className="text-zinc-500 shrink-0">{q.reward} {DROP_TOKEN_SYMBOL}</span>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#53fc18]" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">
                    {Math.min(q.progress, q.target)}/{q.target}
                  </span>
                  {q.claimed ? (
                    <span className="text-[10px] text-[#53fc18] flex items-center gap-0.5">
                      <Check className="h-3 w-3" /> Claimed
                    </span>
                  ) : q.completed ? (
                    <button
                      type="button"
                      disabled={claiming === q.id}
                      onClick={() => claim(q.id)}
                      className="rounded bg-[#53fc18] px-2 py-0.5 text-[10px] font-bold text-black"
                    >
                      {claiming === q.id ? "…" : "Claim"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {msg && <p className="text-[10px] text-[#53fc18] px-1">{msg}</p>}
          <Link href="/#quests" className="block text-center text-[10px] text-zinc-500 hover:text-zinc-300 pt-1">
            All quests on home →
          </Link>
        </div>
      )}
    </div>
  );
}
