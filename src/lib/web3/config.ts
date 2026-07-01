"use client";

import { createConfig, http } from "wagmi";
import { hardhat } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { CONTRACTS } from "./contracts";
import { vechainTestnet, vechainMainnet } from "./chains";
import { getVeWorldProvider } from "./veworld";

const vechain =
  CONTRACTS.chainId === vechainMainnet.id ? vechainMainnet : vechainTestnet;

const chains =
  CONTRACTS.chainId === hardhat.id
    ? ([hardhat] as const)
    : ([vechain] as const);

export const wagmiConfig = createConfig({
  chains,
  // Only VeWorld — generic injected() grabs MetaMask via window.ethereum.
  connectors: [
    injected({
      // Must always return a target — returning undefined falls back to MetaMask.
      target() {
        return {
          id: "io.veworld",
          name: "VeWorld",
          provider() {
            return getVeWorldProvider();
          },
        };
      },
      shimDisconnect: true,
      unstable_shimAsyncInject: 3_000,
    }),
  ],
  multiInjectedProviderDiscovery: false,
  transports: {
    [vechainTestnet.id]: http(
      process.env.NEXT_PUBLIC_VECHAIN_RPC_URL ?? "https://rpc-testnet.vechain.energy",
    ),
    [vechainMainnet.id]: http(
      process.env.NEXT_PUBLIC_VECHAIN_RPC_URL ?? "https://mainnet.vechain.org",
    ),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});

export { vechainTestnet, vechainMainnet, hardhat };
