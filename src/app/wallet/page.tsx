"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wallet, Coins, Droplets, CreditCard, CheckCircle2, Settings } from "lucide-react";
import { useAuth, formatTokens } from "@/context/AuthContext";
import { apiFetch } from "@/lib/fetch-client";
import { OnChainWalletCard } from "@/components/OnChainWalletCard";
import { useOnChainDrop } from "@/hooks/useOnChainDrop";
import { contractsConfigured } from "@/lib/web3/contracts";
import Link from "next/link";
import { WithdrawPanel } from "@/components/WithdrawPanel";
import { StripeConnectPanel } from "@/components/StripeConnectPanel";
import { WalletGuide } from "@/components/WalletGuide";

interface DropPack {
  id: string;
  dropAmount: number;
  priceLabel: string;
  popular?: boolean;
}

function WalletContent() {
  const searchParams = useSearchParams();
  const { user, buyDrop, refresh } = useAuth();
  const { isConnected, contractsReady, isPending, faucet, refetchBalance } = useOnChainDrop();
  const [entries, setEntries] = useState<Array<{ id: string; amount: number; type: string; createdAt: string }>>([]);
  const [buyAmount, setBuyAmount] = useState("100");
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [faucetMsg, setFaucetMsg] = useState("");
  const [buyError, setBuyError] = useState("");
  const [purchaseMsg, setPurchaseMsg] = useState("");
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [packs, setPacks] = useState<DropPack[]>([]);

  useEffect(() => {
    const purchase = searchParams.get("purchase");
    if (purchase === "success") {
      setPurchaseMsg("Payment received — DROP credited to your balance.");
      refresh();
    } else if (purchase === "cancelled") {
      setPurchaseMsg("Checkout cancelled.");
    }
  }, [searchParams, refresh]);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []));
    apiFetch("/api/stripe/checkout")
      .then((r) => r.json())
      .then((d) => {
        setStripeConfigured(Boolean(d.configured));
        setPacks(d.packs ?? []);
      });
  }, [user]);

  async function handleDevBuy() {
    setBuyError("");
    setLoading(true);
    try {
      await buyDrop(parseInt(buyAmount, 10));
      const res = await apiFetch("/api/wallet");
      const data = await res.json();
      setEntries(data.entries ?? []);
      await refresh();
    } catch (e) {
      setBuyError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleStripeCheckout(packId: string) {
    setCheckoutLoading(packId);
    setBuyError("");
    const res = await apiFetch("/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ packId }),
    });
    const data = await res.json();
    setCheckoutLoading(null);
    if (!res.ok) {
      setBuyError(data.error ?? "Checkout failed");
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  async function handleFaucet() {
    setFaucetMsg("");
    try {
      await faucet(100);
      setFaucetMsg("100 DROP minted to your wallet on-chain");
      await refetchBalance();
    } catch (e) {
      setFaucetMsg(e instanceof Error ? e.message : "Faucet failed");
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Link href="/login" className="text-[#53fc18] hover:underline">Login</Link> to view wallet
      </div>
    );
  }

  const devMode = !stripeConfigured;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <WalletGuide />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-7 w-7 text-[#53fc18]" />
          Wallet
        </h1>
        <Link href="/settings" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1">
          <Settings className="h-4 w-4" /> Profile
        </Link>
      </div>

      {purchaseMsg && (
        <p className="mb-4 rounded-lg border border-[#53fc18]/30 bg-[#53fc18]/10 px-4 py-2 text-sm text-[#53fc18] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {purchaseMsg}
        </p>
      )}

      <div className="rounded-xl border border-white/5 bg-[#141416] p-6 mb-6">
        <p className="text-zinc-400 text-sm">In-app balance (off-chain ledger)</p>
        <p className="text-4xl font-bold text-[#53fc18] mt-1">{formatTokens(user.balance)}</p>
        <p className="text-sm text-zinc-500 mt-2">Total earned: {user.totalEarned} DROP</p>
      </div>

      <OnChainWalletCard />

      {contractsReady && isConnected && (
        <div className="mb-6">
          <button
            type="button"
            onClick={handleFaucet}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-[#53fc18]/10 border border-[#53fc18]/30 px-4 py-2 text-sm text-[#53fc18] disabled:opacity-50"
          >
            <Droplets className="h-4 w-4" />
            {isPending ? "Pending..." : "Testnet faucet (100 DROP to VeWorld)"}
          </button>
          {faucetMsg && <p className="text-xs text-zinc-400 mt-2">{faucetMsg}</p>}
        </div>
      )}

      <StripeConnectPanel />

      <WithdrawPanel />

      <div className="rounded-xl border border-white/5 bg-[#141416] p-6 mb-6">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[#53fc18]" />
          Buy DROP
        </h2>

        {stripeConfigured ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {packs.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => handleStripeCheckout(pack.id)}
                disabled={checkoutLoading !== null}
                className={`rounded-xl border p-4 text-left transition-colors hover:border-[#53fc18]/40 disabled:opacity-50 ${
                  pack.popular
                    ? "border-[#53fc18]/30 bg-[#53fc18]/5"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                {pack.popular && (
                  <span className="text-[10px] font-bold uppercase text-[#53fc18]">Popular</span>
                )}
                <p className="font-bold text-lg mt-1">{pack.dropAmount.toLocaleString()}</p>
                <p className="text-xs text-zinc-500">DROP</p>
                <p className="text-sm text-[#53fc18] mt-2 font-semibold">{pack.priceLabel}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 mb-4">
            Add Stripe test keys to enable card checkout. Until then, use dev top-up below.
          </p>
        )}

        {devMode && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
              <Coins className="h-3 w-3" /> Dev top-up (no payment)
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white"
              />
              <button
                onClick={handleDevBuy}
                disabled={loading}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {loading ? "..." : "Add DROP"}
              </button>
            </div>
          </div>
        )}
        {buyError && <p className="text-xs text-red-400 mt-2">{buyError}</p>}
      </div>

      <div className="rounded-xl border border-white/5 bg-[#141416] p-6">
        <h2 className="font-semibold mb-4">Transaction History</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {entries.map((e) => (
            <div key={e.id} className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-zinc-400 capitalize">{e.type.replace(/_/g, " ")}</span>
              <span className={e.amount >= 0 ? "text-[#53fc18]" : "text-red-400"}>
                {e.amount >= 0 ? "+" : ""}{e.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-16 text-center text-zinc-400">Loading wallet...</div>}>
      <WalletContent />
    </Suspense>
  );
}
