"use client";

import {
  Component,
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { buildVeChainKitProviderProps } from "@/lib/vechain-kit-config";

export type KitLoadState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

const KitLoadContext = createContext<KitLoadState>({ status: "loading" });

export function useKitLoadState() {
  return useContext(KitLoadContext);
}

/** @deprecated prefer useKitLoadState */
export function useWeb3Ready() {
  return useContext(KitLoadContext).status === "ready";
}

type KitModules = {
  VeChainKitProvider: React.ComponentType<
    Omit<import("@vechain/vechain-kit").VechainKitProviderProps, "children"> & {
      children: ReactNode;
    }
  >;
  OnChainDropProvider: React.ComponentType<{ children: ReactNode }>;
  LiveBoothWalletLinkEffect: React.ComponentType;
};

class KitErrorBoundary extends Component<
  { children: ReactNode; onError: (message: string) => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("VeChain Kit failed to start:", error);
    this.props.onError(
      error instanceof Error ? error.message : "Wallet provider failed to start",
    );
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function KitShell({
  children,
  state,
}: {
  children: ReactNode;
  state: KitLoadState;
}) {
  return <KitLoadContext.Provider value={state}>{children}</KitLoadContext.Provider>;
}

/** Loads VeChain Kit only on routes that opt in (wallet / stream / achievements). */
export function WalletKitScope({ children }: { children: ReactNode }) {
  const [kit, setKit] = useState<KitModules | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loadState, setLoadState] = useState<KitLoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      import("@vechain/vechain-kit"),
      import("@/hooks/useOnChainDrop"),
      import("@/hooks/useLiveBoothWalletLink"),
    ])
      .then(([kitMod, dropMod, linkMod]) => {
        if (cancelled) return;
        setKit({
          VeChainKitProvider: kitMod.VeChainKitProvider,
          OnChainDropProvider: dropMod.OnChainDropProvider,
          LiveBoothWalletLinkEffect: linkMod.LiveBoothWalletLinkEffect,
        });
      })
      .catch((error: unknown) => {
        console.error("VeChain Kit import failed:", error);
        if (cancelled) return;
        setLoadState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not download the wallet library. Check your connection and refresh.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!kit) return;
    setMounted(true);
  }, [kit]);

  if (loadState.status === "error") {
    return <KitShell state={loadState}>{children}</KitShell>;
  }

  if (!kit || !mounted) {
    return <KitShell state={{ status: "loading" }}>{children}</KitShell>;
  }

  const { VeChainKitProvider, OnChainDropProvider, LiveBoothWalletLinkEffect } = kit;
  const kitProps = buildVeChainKitProviderProps();

  return (
    <KitShell state={{ status: "ready" }}>
      <KitErrorBoundary
        onError={(message) => setLoadState({ status: "error", message })}
      >
        <VeChainKitProvider {...kitProps}>
          <OnChainDropProvider>
            <LiveBoothWalletLinkEffect />
            {children}
          </OnChainDropProvider>
        </VeChainKitProvider>
      </KitErrorBoundary>
    </KitShell>
  );
}
