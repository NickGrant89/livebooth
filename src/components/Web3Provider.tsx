"use client";

import { useMemo, type ReactNode } from "react";
import { VeChainKitProvider } from "@vechain/vechain-kit";
import { buildVeChainKitProviderProps } from "@/lib/vechain-kit-config";

export function Web3Provider({ children }: { children: ReactNode }) {
  const kitProps = useMemo(() => buildVeChainKitProviderProps(), []);

  return <VeChainKitProvider {...kitProps}>{children}</VeChainKitProvider>;
}
