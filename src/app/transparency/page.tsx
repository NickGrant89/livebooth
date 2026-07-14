"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Landmark, Coins, TrendingUp, Wallet } from "lucide-react";
import { DROP_TOKEN_SYMBOL } from "@/lib/constants";

type Stats = {
  updatedAt: string;
  inflow: { fiatInCents: number; dropSoldStripe: number; stripePurchaseCount: number };
  circulation: { userBalanceDrop: number; totalEarnedDrop: number };
  activity: { totalTipsDrop: number; tipCount: number };
  platformRevenue: {
    feeDrop: number;
    tipFeesDrop: number;
    unlockFeesDrop: number;
    requestFeesDrop: number;
    promotionDrop: number;
  };
  withdrawals: {
    paidCount: number;
    paidFiatCents: number;
    pendingCount: number;
    pendingFiatCents: number;
  };
  redeem: { usdCentsPerDrop: number; feePercent: number; minDrop: number };
  onChain: {
    chainName: string;
    treasuryAddress: string;
    treasuryBalanceDrop: number;
    totalSupplyDrop: number;
    explorerTreasuryUrl: string;
    explorerTipRouterUrl: string;
    explorerDropTokenUrl: string;
  } | null;
};

function fmtUsd(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TransparencyPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/transparency")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setStats(d);
      })
      .catch(() => setError("Could not load stats"));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Landmark className="h-8 w-8 text-[#53fc18]" />
          Platform transparency
        </h1>
        <p className="text-zinc-400 mt-2 text-sm max-w-2xl">
          Public snapshot of DROP circulation, platform fees, and cash-out activity. On-chain tip fees
          route to the TipRouter treasury wallet on VeChain.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 mb-6">
          {error}
        </p>
      )}

      {!stats ? (
        <p className="text-zinc-500 text-sm">Loading economy stats…</p>
      ) : (
        <>
          <p className="text-xs text-zinc-600 mb-4">
            Updated {new Date(stats.updatedAt).toLocaleString()} · refreshes every 5 minutes
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Fiat purchased (Stripe)", value: fmtUsd(stats.inflow.fiatInCents), icon: Wallet },
              { label: "DROP in circulation", value: `${stats.circulation.userBalanceDrop.toLocaleString()} ${DROP_TOKEN_SYMBOL}`, icon: Coins },
              { label: "Platform fees earned", value: `${stats.platformRevenue.feeDrop.toLocaleString()} ${DROP_TOKEN_SYMBOL}`, icon: TrendingUp },
              { label: "Paid to creators", value: fmtUsd(stats.withdrawals.paidFiatCents), icon: Landmark },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-[#141416] p-4">
                <Icon className="h-4 w-4 text-[#53fc18] mb-2" />
                <p className="text-lg font-bold font-mono text-white">{value}</p>
                <p className="text-[10px] text-zinc-500 uppercase mt-1">{label}</p>
              </div>
            ))}
          </div>

          <section className="rounded-xl border border-white/10 bg-[#141416] p-5 mb-6 space-y-3">
            <h2 className="font-semibold text-white">In-app economy</h2>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Total tips</dt>
                <dd className="text-zinc-200">{stats.activity.totalTipsDrop.toLocaleString()} {DROP_TOKEN_SYMBOL}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Tip count</dt>
                <dd className="text-zinc-200">{stats.activity.tipCount.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Tip fees (10%)</dt>
                <dd className="text-zinc-200">{stats.platformRevenue.tipFeesDrop.toLocaleString()} {DROP_TOKEN_SYMBOL}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Unlock + request fees</dt>
                <dd className="text-zinc-200">
                  {(stats.platformRevenue.unlockFeesDrop + stats.platformRevenue.requestFeesDrop).toLocaleString()} {DROP_TOKEN_SYMBOL}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Promote booth</dt>
                <dd className="text-zinc-200">{stats.platformRevenue.promotionDrop.toLocaleString()} {DROP_TOKEN_SYMBOL}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Pending withdrawals</dt>
                <dd className="text-zinc-200">{stats.withdrawals.pendingCount} ({fmtUsd(stats.withdrawals.pendingFiatCents)})</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Redeem rate</dt>
                <dd className="text-zinc-200">${(stats.redeem.usdCentsPerDrop / 100).toFixed(4)}/DROP</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Cash-out fee</dt>
                <dd className="text-zinc-200">{stats.redeem.feePercent}% · min {stats.redeem.minDrop} DROP</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#141416] p-5 mb-6 space-y-3">
            <h2 className="font-semibold text-white">Platform fee schedule</h2>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Tips</dt>
                <dd className="text-zinc-200">10% platform · 90% creator</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Track unlocks</dt>
                <dd className="text-zinc-200">15% platform · 85% creator</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Crowd requests</dt>
                <dd className="text-zinc-200">15% platform · 85% creator</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">DJ membership</dt>
                <dd className="text-zinc-200">15% platform · 85% DJ</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Station membership</dt>
                <dd className="text-zinc-200">15% platform · 75% owner + 10% live DJ</dd>
              </div>
            </dl>
          </section>

          {stats.onChain ? (
            <section className="rounded-xl border border-[#53fc18]/20 bg-[#53fc18]/5 p-5 space-y-3">
              <h2 className="font-semibold text-[#53fc18]">On-chain treasury ({stats.onChain.chainName})</h2>
              <p className="text-sm text-zinc-400">
                On-chain tips via TipRouter send 10% of each tip to the platform treasury wallet.
              </p>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Treasury balance</dt>
                  <dd className="text-zinc-200">{stats.onChain.treasuryBalanceDrop.toLocaleString()} {DROP_TOKEN_SYMBOL}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Token supply</dt>
                  <dd className="text-zinc-200">{stats.onChain.totalSupplyDrop.toLocaleString()} {DROP_TOKEN_SYMBOL}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href={stats.onChain.explorerTreasuryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#53fc18] hover:underline"
                >
                  Treasury wallet <ExternalLink className="h-3 w-3" />
                </Link>
                <Link
                  href={stats.onChain.explorerTipRouterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  TipRouter contract <ExternalLink className="h-3 w-3" />
                </Link>
                <Link
                  href={stats.onChain.explorerDropTokenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  DROP token <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <p className="text-[10px] text-zinc-600 font-mono break-all">{stats.onChain.treasuryAddress}</p>
            </section>
          ) : (
            <section className="rounded-xl border border-white/10 bg-[#141416] p-5">
              <h2 className="font-semibold text-white mb-1">On-chain treasury</h2>
              <p className="text-sm text-zinc-500">VeChain contracts not configured on this deployment.</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
