"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { MIN_STAKE_AMOUNT, DROP_TOKEN_SYMBOL } from "@/lib/constants";

export function StakePanel({ djUsername }: { djUsername: string }) {
  const { user, refresh } = useAuth();
  const [totalStaked, setTotalStaked] = useState(0);
  const [stakerCount, setStakerCount] = useState(0);
  const [myStake, setMyStake] = useState<number | null>(null);
  const [amount, setAmount] = useState(String(MIN_STAKE_AMOUNT));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch(`/api/stake?djUsername=${encodeURIComponent(djUsername)}`)
      .then((r) => r.json())
      .then((d) => {
        setTotalStaked(d.totalStaked ?? 0);
        setStakerCount(d.stakerCount ?? 0);
        setMyStake(d.myStake?.amount ?? null);
      });
  }, [djUsername]);

  async function stake() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    setError("");
    const res = await apiFetch("/api/stake", {
      method: "POST",
      body: JSON.stringify({ djUsername, amount: parseInt(amount, 10) }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMyStake(parseInt(amount, 10));
      await refresh();
      setTotalStaked((t) => t + parseInt(amount, 10));
    } else {
      setError(data.error ?? "Stake failed");
    }
  }

  async function unstake() {
    setLoading(true);
    const res = await apiFetch(`/api/stake?djUsername=${encodeURIComponent(djUsername)}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (res.ok) {
      setMyStake(null);
      await refresh();
    }
  }

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 mt-6">
      <h3 className="font-semibold flex items-center gap-2 text-cyan-300">
        <TrendingUp className="h-4 w-4" />
        Stake on this DJ
      </h3>
      <p className="text-xs text-zinc-500 mt-1">
        Back {djUsername} with DROP — {stakerCount} stakers · {totalStaked} {DROP_TOKEN_SYMBOL} pooled
      </p>
      {myStake != null ? (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm">Your stake: <span className="text-cyan-300 font-bold">{myStake} {DROP_TOKEN_SYMBOL}</span></p>
          <button type="button" onClick={unstake} disabled={loading} className="text-xs text-zinc-400 hover:text-white underline">
            Unstake
          </button>
        </div>
      ) : user ? (
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={MIN_STAKE_AMOUNT}
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={stake}
            disabled={loading}
            className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-4 py-2 text-sm font-bold text-cyan-200 disabled:opacity-50"
          >
            Stake
          </button>
        </div>
      ) : (
        <p className="text-xs text-zinc-500 mt-2">Sign in to stake</p>
      )}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
