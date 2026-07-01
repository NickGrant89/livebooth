"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Link2, Unlink } from "lucide-react";
import { useWallet } from "@vechain/dapp-kit-react";
import { useAuth, formatAddress } from "@/context/AuthContext";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useOnChainDrop } from "@/hooks/useOnChainDrop";
import { apiFetch } from "@/lib/fetch-client";
import { contractsConfigured, CONTRACTS, formatDropWei } from "@/lib/web3/contracts";

type OnChainStatus = {
  contractsConfigured: boolean;
  linkedAddress: string | null;
  canReceiveOnChainTips: boolean;
  chainId: number;
};

export function OnChainWalletCard() {
  const { user, refresh } = useAuth();
  const wallet = useWallet();
  const { balanceWei, isConnected, refetchBalance } = useOnChainDrop();
  const [status, setStatus] = useState<OnChainStatus | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [msg, setMsg] = useState("");

  const connectedAddress = wallet.account as `0x${string}` | undefined;
  const linked = user?.walletAddress?.startsWith("0x") ? user.walletAddress : null;
  const mismatch =
    Boolean(linked && connectedAddress && linked.toLowerCase() !== connectedAddress.toLowerCase());

  useEffect(() => {
    apiFetch("/api/wallet/on-chain")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStatus(d as OnChainStatus));
  }, [user?.walletAddress]);

  async function unlinkWallet() {
    setUnlinking(true);
    setMsg("");
    const res = await apiFetch("/api/wallet", { method: "DELETE" });
    setUnlinking(false);
    if (!res.ok) {
      setMsg("Could not unlink wallet");
      return;
    }
    await refresh();
    setMsg("Wallet unlinked from your account");
  }

  const onChainBal = balanceWei !== undefined ? formatDropWei(balanceWei) : null;
  const isDj = user?.role === "dj" || user?.role === "admin";

  return (
    <div className="rounded-xl border border-[#15CFF4]/25 bg-[#15CFF4]/5 p-6 mb-6 space-y-4">
      <div>
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-[#15CFF4]" />
          On-chain DROP · VeChain Testnet
        </h2>
        <p className="text-sm text-zinc-400">
          In-app balance is off-chain. Connect VeWorld for on-chain tips{isDj ? " and to receive tips as a DJ" : ""}.
        </p>
      </div>

      {!contractsConfigured() && (
        <p className="text-xs text-amber-400/90">
          Contracts not configured — run <code className="text-amber-300">npm run contracts:sync-env</code>
        </p>
      )}

      <ConnectWalletButton variant="veworld" />

      {isConnected && onChainBal !== null && (
        <p className="text-sm text-zinc-400">
          VeWorld balance:{" "}
          <span className="text-[#53fc18] font-bold">{onChainBal.toLocaleString()} DROP</span>
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
            <p className="text-zinc-200">Linked to LiveBooth</p>
            <p className="text-xs font-mono text-zinc-500 truncate">{formatAddress(linked)}</p>
          </div>
        </div>
      )}

      {mismatch && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            VeWorld ({formatAddress(connectedAddress!)}) doesn&apos;t match your linked address.
            Reconnect the correct wallet or unlink below.
          </p>
        </div>
      )}

      {isDj && !linked && contractsConfigured() && (
        <p className="text-xs text-zinc-500">
          Connect VeWorld above — your address will link automatically so fans can tip on-chain during live sets.
        </p>
      )}

      {linked && (
        <button
          type="button"
          onClick={unlinkWallet}
          disabled={unlinking}
          className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-red-400 disabled:opacity-50"
        >
          <Unlink className="h-3.5 w-3.5" />
          {unlinking ? "Unlinking…" : "Unlink wallet from account"}
        </button>
      )}

      {msg && <p className="text-xs text-zinc-400">{msg}</p>}

      {status?.contractsConfigured && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-[11px] text-zinc-400 space-y-2">
          <p className="text-zinc-300 font-medium">
            Add DROP token in VeWorld: Manage Tokens → Custom → paste contract below (Testnet).
          </p>
          <p className="font-mono text-[10px] break-all text-zinc-500">{CONTRACTS.dropToken}</p>
          <p>
            Chain ID {status.chainId} ·{" "}
            <a
              href={`https://explore.vechain.org/address/${CONTRACTS.dropToken}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#15CFF4] underline"
            >
              View on explorer
            </a>
          </p>
          {isDj && status.canReceiveOnChainTips && (
            <p className="text-[#53fc18]">✓ Ready to receive on-chain tips while live</p>
          )}
        </div>
      )}
    </div>
  );
}
