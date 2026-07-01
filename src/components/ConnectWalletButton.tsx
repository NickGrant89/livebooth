"use client";

import { useWallet } from "@vechain/dapp-kit-react";
import { useAuth, formatAddress } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { isLocalDevHost } from "@/lib/web3/veworld";

interface ConnectWalletButtonProps {
  variant?: "veworld" | "minimal";
  className?: string;
  linkToAccount?: boolean;
}

function VeWorldIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#15CFF4" fillOpacity="0.2" stroke="#15CFF4" strokeWidth="1.5" />
      <path
        d="M8 12.5c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4"
        stroke="#15CFF4"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12.5" r="1.5" fill="#15CFF4" />
    </svg>
  );
}

export function ConnectWalletButton({
  variant = "veworld",
  className,
  linkToAccount = true,
}: ConnectWalletButtonProps) {
  const wallet = useWallet();
  const { user, linkWallet, refresh } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [linkError, setLinkError] = useState("");
  const [localHost, setLocalHost] = useState(true);

  const address = wallet.account as `0x${string}` | undefined;
  const isConnected = Boolean(address);

  useEffect(() => {
    setLocalHost(isLocalDevHost());
  }, []);

  useEffect(() => {
    if (linkToAccount && isConnected && address && user && user.walletAddress !== address) {
      setLinkError("");
      linkWallet(address)
        .then(() => refresh())
        .catch((e: unknown) => {
          setLinkError(e instanceof Error ? e.message : "Failed to link wallet");
        });
    }
  }, [address, isConnected, linkToAccount, linkWallet, refresh, user]);

  async function handleConnect() {
    setIsPending(true);
    setError("");
    try {
      wallet.setSource("veworld");
      await wallet.connect();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setIsPending(false);
    }
  }

  const connectedClass =
    className ??
    "inline-flex items-center gap-2 rounded-xl border border-[#15CFF4]/30 bg-[#15CFF4]/10 px-4 py-2.5 text-sm font-medium text-[#15CFF4] hover:bg-[#15CFF4]/20 transition-colors";

  if (isConnected && address) {
    const isLinked =
      Boolean(user?.walletAddress) &&
      user!.walletAddress!.toLowerCase() === address.toLowerCase();

    return (
      <button type="button" onClick={() => wallet.disconnect()} className={connectedClass}>
        <VeWorldIcon />
        <span>VeWorld</span>
        <span className="text-zinc-500 text-xs">{formatAddress(address)}</span>
        {isLinked ? (
          <span className="text-[10px] font-bold uppercase text-[#53fc18]">Linked</span>
        ) : user?.walletAddress ? (
          <span className="text-[10px] text-amber-400">Mismatch</span>
        ) : linkToAccount ? (
          <span className="text-[10px] text-zinc-500">Linking…</span>
        ) : null}
        <span className="text-zinc-600 text-xs">· disconnect</span>
      </button>
    );
  }

  const connectClass =
    className ??
    (variant === "veworld"
      ? "inline-flex items-center justify-center gap-2.5 w-full rounded-xl bg-[#15CFF4] px-5 py-3 text-sm font-bold text-[#041018] hover:bg-[#3dd9ff] shadow-lg shadow-[#15CFF4]/25 transition-all hover:-translate-y-0.5 disabled:opacity-50"
      : "rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5");

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => void handleConnect()}
        className={connectClass}
      >
        {variant === "veworld" ? (
          <>
            <VeWorldIcon className="h-5 w-5" />
            {isPending ? "Connecting..." : "Connect VeWorld"}
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4" />
            {isPending ? "Connecting..." : "Connect Wallet"}
          </>
        )}
      </button>
      {variant === "veworld" && (
        <p className="text-[11px] text-zinc-500 text-center">
          VeChain Testnet · opens VeWorld extension
        </p>
      )}
      {!localHost && variant === "veworld" && (
        <p className="text-[11px] text-amber-400/90 text-center">
          Wallet extensions work best on{" "}
          <a href="http://localhost:3008/wallet" className="underline">
            localhost:3008
          </a>
          , not LAN IPs.
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400 text-center">{error.slice(0, 140)}</p>
      )}
      {linkError && (
        <p className="text-xs text-red-400 text-center">{linkError}</p>
      )}
    </div>
  );
}
