"use client";

import { useEffect, useState } from "react";
import { ChevronDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { MIN_STAKE_AMOUNT, DROP_TOKEN_SYMBOL } from "@/lib/constants";
import { STAKING_COPY, STAKING_DEEMPHASIZED } from "@/lib/staking-ui";

export function StakePanel({ djUsername }: { djUsername: string }) {
  const { user, refresh } = useAuth();
  const [totalStaked, setTotalStaked] = useState(0);
  const [stakerCount, setStakerCount] = useState(0);
  const [myStake, setMyStake] = useState<number | null>(null);
  const [amount, setAmount] = useState(String(MIN_STAKE_AMOUNT));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(!STAKING_DEEMPHASIZED);

  useEffect(() => {
    apiFetch(`/api/stake?djUsername=${encodeURIComponent(djUsername)}`)
      .then((r) => r.json())
      .then((d) => {
        setTotalStaked(d.totalStaked ?? 0);
        setStakerCount(d.stakerCount ?? 0);
        const stake = d.myStake?.amount ?? null;
        setMyStake(stake);
        if (stake != null) setOpen(true);
      });
  }, [djUsername]);

  if (STAKING_DEEMPHASIZED && myStake == null) {
    return null;
  }

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

  const title = STAKING_DEEMPHASIZED ? STAKING_COPY.djTitle : "Stake on this DJ";

  const body = (
    <>
      <p className="text-xs text-zinc-500 mt-1">
        {STAKING_DEEMPHASIZED
          ? STAKING_COPY.djHint
          : `Back ${djUsername} with DROP — ${stakerCount} stakers · ${totalStaked} ${DROP_TOKEN_SYMBOL} pooled`}
      </p>
      {myStake != null ? (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm">
            Your stake:{" "}
            <span className="text-[#53fc18] font-bold">
              {myStake} {DROP_TOKEN_SYMBOL}
            </span>
          </p>
          <button
            type="button"
            onClick={unstake}
            disabled={loading}
            className="text-xs text-zinc-400 hover:text-white underline"
          >
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
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-50"
          >
            Stake
          </button>
        </div>
      ) : (
        <p className="text-xs text-zinc-500 mt-2">Sign in to stake</p>
      )}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </>
  );

  if (STAKING_DEEMPHASIZED) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] mt-6">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 p-5 text-left"
        >
          <span className="font-medium text-sm text-zinc-300 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-zinc-500" />
            {title}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && <div className="px-5 pb-5">{body}</div>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 mt-6">
      <h3 className="font-semibold flex items-center gap-2 text-cyan-300">
        <TrendingUp className="h-4 w-4" />
        {title}
      </h3>
      {body}
    </div>
  );
}
