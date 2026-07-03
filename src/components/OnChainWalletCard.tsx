"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Link2, Sparkles } from "lucide-react";
import { useWallet } from "@vechain/vechain-kit";
import { useAuth, formatAddress } from "@/context/AuthContext";
import { LiveBoothWalletConnect } from "@/components/LiveBoothWalletConnect";
import { useOnChainDrop } from "@/hooks/useOnChainDrop";
import { useLiveBoothWalletLink } from "@/hooks/useLiveBoothWalletLink";
import { apiFetch } from "@/lib/fetch-client";
import { contractsConfigured, CONTRACTS } from "@/lib/web3/contracts";
import { privyConfigured } from "@/lib/vechain-kit-config";

type OnChainStatus = {
  contractsConfigured: boolean;
  linkedAddress: string | null;
  canReceiveOnChainTips: boolean;
  chainId: number;
};

export function OnChainWalletCard() {
  const { user, refresh } = useAuth();
  const { account, connection } = useWallet();
  useLiveBoothWalletLink();
  const { balanceWei, isConnected, refetchBalance, isEmbeddedWallet } = useOnChainDrop();
  const [status, setStatus] = useState<OnChainStatus | null>(null);

  const connectedAddress = account?.address;
  const linked = user?.walletAddress?.startsWith("0x") ? user.walletAddress : null;
  const mismatch =
    Boolean(linked && connectedAddress && linked.toLowerCase() !== connectedAddress.toLowerCase());

  useEffect(() => {
    apiFetch("/api/wallet/on-chain")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStatus(d as OnChainStatus));
  }, [user?.walletAddress]);

  const onChainBal =
    balanceWei !== undefined ? Number(balanceWei / BigInt(10 ** 18)) : null;
  const isDj = user?.role === "dj" || user?.role === "admin";

  return (
    <div className="rounded-xl border border-[#15CFF4]/25 bg-[#15CFF4]/5 p-6 mb-6 space-y-4">
      <div>
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#53fc18]" />
          LiveBooth on-chain wallet
        </h2>
        <p className="text-sm text-zinc-400">
          In-app DROP is off-chain. Enable an embedded wallet for one-click on-chain tips
          {isDj ? " and to receive tips as a DJ" : ""} — VeWorld still works too.
        </p>
      </div>

      {!contractsConfigured() && (
        <p className="text-xs text-amber-400/90">
          Contracts not configured — run <code className="text-amber-300">npm run contracts:sync-env</code>
        </p>
      )}

      {!privyConfigured() && (
        <p className="text-xs text-zinc-500 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
          Tip: set <code className="text-zinc-400">NEXT_PUBLIC_PRIVY_APP_ID</code> and{" "}
          <code className="text-zinc-400">NEXT_PUBLIC_PRIVY_CLIENT_ID</code> for email embedded wallets.
          Without Privy, use Google or VeWorld via the connect modal.
        </p>
      )}

      <LiveBoothWalletConnect />

      {isConnected && onChainBal !== null && (
        <p className="text-sm text-zinc-400">
          On-chain balance:{" "}
          <span className="text-[#53fc18] font-bold">{onChainBal.toLocaleString()} DROP</span>
          {isEmbeddedWallet && (
            <span className="ml-2 text-[10px] uppercase text-[#53fc18]/80">embedded</span>
          )}
          <button
            type="button"
            onClick={() => void refetchBalance()}
            className="ml-2 text-xs text-zinc-500 underline"
          >
            refresh
          </button>
        </p>
      )}

      {linked && (
        <div className="flex items-start gap-2 rounded-lg border border-[#53fc18]/25 bg-[#53fc18]/10 px-3 py-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-[#53fc18] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-zinc-200">Linked to LiveBooth account</p>
            <p className="text-xs font-mono text-zinc-500 truncate">{formatAddress(linked)}</p>
          </div>
        </div>
      )}

      {mismatch && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Connected wallet ({formatAddress(connectedAddress!)}) doesn&apos;t match your linked
            address. Reconnect or unlink in settings.
          </p>
        </div>
      )}

      {isDj && !linked && contractsConfigured() && (
        <p className="text-xs text-zinc-500 flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5" />
          Enable your wallet above so fans can tip you on-chain during live sets.
        </p>
      )}

      {status?.contractsConfigured && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-[11px] text-zinc-400 space-y-2">
          <p className="text-zinc-300 font-medium">
            Add DROP in VeWorld (optional): Manage Tokens → Custom → paste contract below (Testnet).
          </p>
          <p className="font-mono text-[10px] break-all text-zinc-500">{CONTRACTS.dropToken}</p>
          <p>
            Testnet gas is sponsored via VeChain Kit fee delegation when you use an embedded wallet.
          </p>
          {isDj && status.canReceiveOnChainTips && (
            <p className="text-[#53fc18]">Ready to receive on-chain tips while live</p>
          )}
        </div>
      )}

      {!isConnected && (
        <p className="text-[11px] text-zinc-600">
          Already use VeWorld? Choose VeWorld in the connect modal.{" "}
          <Link href="/help/fans" className="text-[#53fc18] hover:underline">
            Wallet help
          </Link>
        </p>
      )}
    </div>
  );
}
