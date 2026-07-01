"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DAppKitProvider } from "@vechain/dapp-kit-react";
import { useState, type ReactNode } from "react";

const VECHAIN_NODE =
  process.env.NEXT_PUBLIC_VECHAIN_NODE_URL ?? "https://testnet.vechain.org";

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <DAppKitProvider
      node={VECHAIN_NODE}
      usePersistence
      allowedWallets={["veworld"]}
      v2Api={{ enabled: true }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </DAppKitProvider>
  );
}
