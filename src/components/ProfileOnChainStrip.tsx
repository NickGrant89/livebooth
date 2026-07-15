import Link from "next/link";
import { Coins, ExternalLink } from "lucide-react";
import { DROP_TOKEN_SYMBOL } from "@/lib/constants";
import { isOnChainEnabled } from "@/lib/web3/contracts";
import deployed from "@/lib/contracts/deployed.json";

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

type ProfileOnChainStripProps = {
  walletAddress?: string | null;
  isOwnProfile: boolean;
  isDj: boolean;
};

export function ProfileOnChainStrip({ walletAddress, isOwnProfile, isDj }: ProfileOnChainStripProps) {
  if (!isOnChainEnabled()) return null;

  const dropToken = deployed.dropToken;
  const hasWallet = Boolean(walletAddress?.startsWith("0x"));

  return (
    <div className="mt-4 rounded-xl border border-[#15CFF4]/20 bg-[#15CFF4]/5 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[#15CFF4] flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            On-chain {DROP_TOKEN_SYMBOL}
          </p>
          {hasWallet ? (
            <p className="text-sm text-zinc-300 mt-1">
              {isOwnProfile ? "Your linked wallet" : "Tips wallet"}:{" "}
              <span className="font-mono text-zinc-400">{shortAddress(walletAddress!)}</span>
            </p>
          ) : isOwnProfile && isDj ? (
            <p className="text-sm text-zinc-400 mt-1">
              Link a VeChain wallet so fans can tip you on-chain during live sets.
            </p>
          ) : (
            <p className="text-sm text-zinc-400 mt-1">
              Tip this DJ with on-chain {DROP_TOKEN_SYMBOL} when they&apos;re live.
            </p>
          )}
          <p className="text-[10px] font-mono text-zinc-600 mt-1.5 break-all">
            DROP token (VeChain testnet): {dropToken}
          </p>
        </div>
        <Link
          href="/wallet"
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10 shrink-0"
        >
          {isOwnProfile ? "Open wallet" : "Tip with DROP"}
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
