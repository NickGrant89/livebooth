import { createPublicClient, http, type Chain } from "viem";
import { vechainMainnet, vechainTestnet } from "./chains";
import { CONTRACTS } from "./contracts";

const RPC_URL =
  process.env.NEXT_PUBLIC_VECHAIN_RPC_URL ??
  (CONTRACTS.chainId === 100009
    ? "https://mainnet.vechain.org"
    : "https://rpc-testnet.vechain.energy");

export function getVeChain(): Chain {
  return CONTRACTS.chainId === 100009 ? vechainMainnet : vechainTestnet;
}

export function createVeChainPublicClient() {
  return createPublicClient({
    chain: getVeChain(),
    transport: http(RPC_URL),
  });
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
