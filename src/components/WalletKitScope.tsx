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

const Web3ReadyContext = createContext(false);

export function useWeb3Ready() {
  return useContext(Web3ReadyContext);
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
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("VeChain Kit failed to load:", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function KitFallback({ children }: { children: ReactNode }) {
  return <Web3ReadyContext.Provider value={false}>{children}</Web3ReadyContext.Provider>;
}

/** Loads VeChain Kit only on routes that opt in (wallet / stream / achievements). */
export function WalletKitScope({ children }: { children: ReactNode }) {
  const [kit, setKit] = useState<KitModules | null>(null);
  const [failed, setFailed] = useState(false);

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
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || !kit) {
    return <KitFallback>{children}</KitFallback>;
  }

  const { VeChainKitProvider, OnChainDropProvider, LiveBoothWalletLinkEffect } = kit;
  const kitProps = buildVeChainKitProviderProps();
  const fallback = <KitFallback>{children}</KitFallback>;

  return (
    <KitErrorBoundary fallback={fallback}>
      <Web3ReadyContext.Provider value={true}>
        <VeChainKitProvider {...kitProps}>
          <OnChainDropProvider>
            <LiveBoothWalletLinkEffect />
            {children}
          </OnChainDropProvider>
        </VeChainKitProvider>
      </Web3ReadyContext.Provider>
    </KitErrorBoundary>
  );
}
