"use client";

import Link from "next/link";
import { Link2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { contractsConfigured } from "@/lib/web3/contracts";

export function DjWalletBanner() {
  const { user } = useAuth();
  if (!user || user.role === "fan") return null;
  if (!contractsConfigured()) return null;
  if (user.walletAddress?.startsWith("0x")) return null;

  return (
    <div className="mx-4 lg:mx-6 mb-4 rounded-xl border border-[#15CFF4]/30 bg-[#15CFF4]/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[#15CFF4] flex items-center gap-2">
        <Link2 className="h-4 w-4 shrink-0" />
        Connect VeWorld on your wallet page to receive on-chain tips.
      </p>
      <Link
        href="/wallet"
        className="text-xs font-bold uppercase text-[#041018] bg-[#15CFF4] px-3 py-1.5 rounded-lg hover:bg-[#3dd9ff]"
      >
        Link wallet
      </Link>
    </div>
  );
}
