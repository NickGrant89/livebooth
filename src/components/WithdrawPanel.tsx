"use client";

import { useEffect, useState } from "react";
import { Banknote, Loader2, Info } from "lucide-react";
import { apiFetch } from "@/lib/fetch-client";
import { useAuth, formatTokens } from "@/context/AuthContext";
import { quoteWithdrawal, formatUsd } from "@/lib/redeem";

type WithdrawRow = {
  id: string;
  dropAmount: number;
  feeDrop: number;
  netUsdCents: number;
  status: string;
  rejectReason: string | null;
  createdAt: string;
};

type Quote = {
  minDrop: number;
  feePercent: number;
  redeemRateLabel: string;
};

export function WithdrawPanel() {
  const { user, refresh } = useAuth();
  const [amount, setAmount] = useState("500");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [requests, setRequests] = useState<WithdrawRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const res = await apiFetch("/api/wallet/withdraw");
    if (res.ok) {
      const d = await res.json();
      setQuote(d.quote);
      setRequests(d.requests ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  const parsed = parseInt(amount, 10) || 0;
  const preview = parsed > 0 ? quoteWithdrawal(parsed) : null;

  async function submit() {
    setErr("");
    setMsg("");
    setSubmitting(true);
    const res = await apiFetch("/api/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify({ amount: parsed }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setErr(d.error ?? "Withdrawal failed");
      return;
    }
    setMsg(`Request submitted — ${formatUsd(d.request.netUsdCents)} after fees (pending admin review)`);
    await refresh();
    await load();
  }

  if (!user || (user.role !== "dj" && user.role !== "station" && user.role !== "admin")) {
    return null;
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/5 bg-[#141416] p-6 mb-6 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  const minDrop = quote?.minDrop ?? 500;
  const hasPending = requests.some((r) => r.status === "pending" || r.status === "approved");

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 mb-6">
      <h2 className="font-semibold mb-1 flex items-center gap-2 text-amber-100">
        <Banknote className="h-4 w-4" />
        Cash out DROP
      </h2>
      <p className="text-xs text-zinc-400 mb-4 flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        Redeem at platform rate ({quote?.redeemRateLabel ?? "~$0.0425/DROP"}) minus {quote?.feePercent ?? 2}% fee.
        Payouts are manual in demo — admin marks paid after bank/Stripe Connect (production).
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="number"
          min={minDrop}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 rounded-lg bg-black/30 border border-white/10 px-4 py-2 text-white"
          placeholder={`Min ${minDrop} DROP`}
        />
        <button
          type="button"
          disabled={submitting || hasPending || parsed < minDrop || parsed > user.balance}
          onClick={() => submit()}
          className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-5 py-2 text-sm font-bold text-amber-200 hover:bg-amber-500/30 disabled:opacity-40"
        >
          {submitting ? "Submitting…" : "Request payout"}
        </button>
      </div>

      <p className="text-xs text-zinc-500 mb-2">
        Balance: {formatTokens(user.balance)} · Min {minDrop} DROP
        {preview && parsed >= minDrop && (
          <span className="text-amber-200/80">
            {" "}
            → ~{formatUsd(preview.netUsdCents)} net ({preview.feeDrop} DROP fee)
          </span>
        )}
      </p>

      {hasPending && (
        <p className="text-xs text-amber-300 mb-2">You have a pending withdrawal — wait for admin review.</p>
      )}
      {err && <p className="text-xs text-red-400 mb-2">{err}</p>}
      {msg && <p className="text-xs text-[#53fc18] mb-2">{msg}</p>}

      {requests.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-3 space-y-1.5 max-h-40 overflow-y-auto">
          <p className="text-[10px uppercase text-zinc-500 font-bold">Your requests</p>
          {requests.map((r) => (
            <div key={r.id} className="flex justify-between text-xs text-zinc-400">
              <span>
                {r.dropAmount} DROP · <span className="capitalize">{r.status}</span>
                {r.rejectReason && <span className="text-red-400/80"> — {r.rejectReason}</span>}
              </span>
              <span>{formatUsd(r.netUsdCents)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
