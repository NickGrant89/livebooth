"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { VeChainKitProvider } from "@vechain/vechain-kit";
import { buildVeChainKitProviderProps } from "@/lib/vechain-kit-config";
import { OnChainDropProvider } from "@/hooks/useOnChainDrop";
import { LiveBoothWalletLinkEffect } from "@/hooks/useLiveBoothWalletLink";

const Web3ReadyContext = createContext(false);

export function useWeb3Ready() {
  return useContext(Web3ReadyContext);
}

export function Web3Provider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const kitProps = useMemo(() => buildVeChainKitProviderProps(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Web3ReadyContext.Provider value={false}>{children}</Web3ReadyContext.Provider>
    );
  }

  return (
    <Web3ReadyContext.Provider value={true}>
      <VeChainKitProvider {...kitProps}>
        <OnChainDropProvider>
          <LiveBoothWalletLinkEffect />
          {children}
        </OnChainDropProvider>
      </VeChainKitProvider>
    </Web3ReadyContext.Provider>
  );
}
