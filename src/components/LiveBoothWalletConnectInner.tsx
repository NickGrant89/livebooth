"use client";

import { useConnectModal, useWallet } from "@vechain/vechain-kit";
import { Sparkles, Wallet, Unlink } from "lucide-react";
import { useAuth, formatAddress } from "@/context/AuthContext";
import { privyConfigured } from "@/lib/vechain-kit-config";
import { apiFetch } from "@/lib/fetch-client";
import { useState } from "react";

interface LiveBoothWalletConnectInnerProps {
  className?: string;
}

export function LiveBoothWalletConnectInner({ className }: LiveBoothWalletConnectInnerProps) {
  const { open } = useConnectModal();
  const { account, connection, disconnect } = useWallet();
  const { user, refresh } = useAuth();

  const [unlinking, setUnlinking] = useState(false);
  const [msg, setMsg] = useState("");

  const address = account?.address;
  const isConnected = connection.isConnected;
  const isEmbedded =
    connection.isConnectedWithSocialLogin || connection.isConnectedWithPrivy;
  const isLinked =
    Boolean(address && user?.walletAddress) &&
    user!.walletAddress!.toLowerCase() === address!.toLowerCase();

  async function unlinkWallet() {
    setUnlinking(true);
    setMsg("");
    const res = await apiFetch("/api/wallet", { method: "DELETE" });
    setUnlinking(false);
    if (!res.ok) {
      setMsg("Could not unlink wallet from LiveBooth account");
      return;
    }
    await refresh();
    setMsg("Wallet unlinked from LiveBooth");
  }

  if (isConnected && address) {
    return (
      <div className={className ?? "space-y-2"}>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#53fc18]/30 bg-[#53fc18]/10 px-4 py-3 text-sm">
          <Wallet className="h-4 w-4 text-[#53fc18] shrink-0" />
          <span className="font-medium text-zinc-200">
            {isEmbedded ? "LiveBooth wallet" : connection.source?.displayName ?? "Connected"}
          </span>
          <span className="font-mono text-xs text-zinc-500">{formatAddress(address)}</span>
          {isLinked ? (
            <span className="text-[10px] font-bold uppercase text-[#53fc18]">Linked</span>
          ) : (
            <span className="text-[10px] text-zinc-500">Linking…</span>
          )}
          <button
            type="button"
            onClick={() => void disconnect()}
            className="ml-auto text-xs text-zinc-500 hover:text-white"
          >
            Disconnect
          </button>
        </div>
        {user?.walletAddress && (
          <button
            type="button"
            onClick={() => void unlinkWallet()}
            disabled={unlinking}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 disabled:opacity-50"
          >
            <Unlink className="h-3.5 w-3.5" />
            {unlinking ? "Unlinking…" : "Unlink from LiveBooth account"}
          </button>
        )}
        {msg && <p className="text-xs text-zinc-400">{msg}</p>}
      </div>
    );
  }

  const primaryClass =
    className ??
    "inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#53fc18] px-5 py-3 text-sm font-bold text-[#041018] hover:bg-[#6aff35] shadow-lg shadow-[#53fc18]/20 transition-all disabled:opacity-50";

  return (
    <div className="space-y-2">
      <button type="button" onClick={() => open()} className={primaryClass}>
        <Sparkles className="h-5 w-5" />
        Enable LiveBooth on-chain wallet
      </button>
      <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
        {privyConfigured()
          ? "Sign in with email to get an embedded wallet — no VeWorld install needed."
          : "Connect with Google or VeWorld. Add Privy keys for email wallets (see .env.example)."}
        {" "}
        Gas is sponsored on testnet.
      </p>
    </div>
  );
}
