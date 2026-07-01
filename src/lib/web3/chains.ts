import { defineChain } from "viem";

/** VeChain Thor testnet — chain ID from genesis block */
export const vechainTestnet = defineChain({
  id: 100010,
  name: "VeChain Testnet",
  nativeCurrency: { name: "VeChain", symbol: "VET", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_VECHAIN_RPC_URL ?? "https://rpc-testnet.vechain.energy"],
    },
  },
  blockExplorers: {
    default: {
      name: "VeChain Explorer",
      url: "https://explore.vechain.org",
    },
  },
  testnet: true,
});

export const vechainMainnet = defineChain({
  id: 100009,
  name: "VeChain",
  nativeCurrency: { name: "VeChain", symbol: "VET", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_VECHAIN_RPC_URL ?? "https://mainnet.vechain.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "VeChainStats",
      url: "https://vechainstats.com",
    },
  },
});
