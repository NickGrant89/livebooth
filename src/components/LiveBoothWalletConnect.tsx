"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useKitLoadState } from "@/components/WalletKitScope";

interface LiveBoothWalletConnectProps {
  className?: string;
}

export function LiveBoothWalletConnect({ className }: LiveBoothWalletConnectProps) {
  const loadState = useKitLoadState();
  const [Inner, setInner] = useState<
    typeof import("@/components/LiveBoothWalletConnectInner").LiveBoothWalletConnectInner | null
  >(null);

  useEffect(() => {
    if (loadState.status !== "ready") {
      setInner(null);
      return;
    }

    let cancelled = false;
    import("@/components/LiveBoothWalletConnectInner").then((mod) => {
      if (!cancelled) setInner(() => mod.LiveBoothWalletConnectInner);
    });

    return () => {
      cancelled = true;
    };
  }, [loadState.status]);

  if (loadState.status === "loading") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-500">
        <span className="inline-flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
          Loading on-chain wallet…
        </span>
        <p className="mt-2 text-[11px] text-zinc-600 leading-relaxed">
          Downloading the VeChain wallet library — usually a few seconds on first visit.
        </p>
      </div>
    );
  }

  if (loadState.status === "error") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 space-y-2">
        <p className="font-medium">On-chain wallet unavailable</p>
        <p className="text-xs text-amber-200/80 leading-relaxed">
          {loadState.message}. Your in-app DROP balance still works — only on-chain tips need this.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-100 underline hover:no-underline"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh and try again
        </button>
      </div>
    );
  }

  if (!Inner) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-500">
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#53fc18]" />
          Starting wallet…
        </span>
      </div>
    );
  }

  return <Inner className={className} />;
}
