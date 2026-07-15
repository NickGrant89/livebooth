import { createPublicClient, http, type Address } from "viem";
import {
  CONTRACTS,
  ABIS,
  formatDropWei,
  onChainFeaturesAvailable,
} from "./web3/contracts";
import { vechainTestnet, vechainMainnet } from "./web3/chains";

function getChain() {
  const id = CONTRACTS.chainId;
  return id === 100009 ? vechainMainnet : vechainTestnet;
}

function explorerAddressUrl(address: string): string {
  const chain = getChain();
  const base = chain.blockExplorers?.default?.url ?? "https://explore.vechain.org";
  return `${base}/accounts/${address}?network=${chain.testnet ? "test" : "main"}`;
}

export type OnChainTreasuryStats = {
  chainId: number;
  chainName: string;
  dropTokenAddress: string;
  tipRouterAddress: string;
  treasuryAddress: string;
  treasuryBalanceDrop: number;
  totalSupplyDrop: number;
  explorerTreasuryUrl: string;
  explorerTipRouterUrl: string;
  explorerDropTokenUrl: string;
};

function resolveVeChainRpc(defaultUrl: string): string {
  const publicUrl = process.env.NEXT_PUBLIC_VECHAIN_RPC_URL?.trim();
  const devUrl = process.env.VECHAIN_TESTNET_RPC_URL?.trim();
  const isLoopback = (u: string) => /^https?:\/\/(127\.0\.0\.1|localhost)([:/]|$)/.test(u);
  const preferPublic =
    process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  if (preferPublic) {
    if (publicUrl && !isLoopback(publicUrl)) return publicUrl;
    return defaultUrl;
  }
  if (devUrl && !isLoopback(devUrl)) return devUrl;
  if (publicUrl) return publicUrl;
  if (devUrl) return devUrl;
  return defaultUrl;
}

export async function getOnChainTreasuryStats(): Promise<OnChainTreasuryStats | null> {
  if (!onChainFeaturesAvailable()) return null;

  const chain = getChain();
  const rpc = resolveVeChainRpc(chain.rpcUrls.default.http[0]);

  try {
    const client = createPublicClient({
      chain,
      transport: http(rpc, { timeout: 8_000 }),
    });

    const treasuryOverride = process.env.NEXT_PUBLIC_PLATFORM_TREASURY_ADDRESS?.trim();
    const treasuryAddress = (treasuryOverride ||
      (await client.readContract({
        address: CONTRACTS.tipRouter,
        abi: ABIS.tipRouter,
        functionName: "platformTreasury",
      }))) as Address;

    const [treasuryBalanceWei, totalSupplyWei] = await Promise.all([
      client.readContract({
        address: CONTRACTS.dropToken,
        abi: ABIS.dropToken,
        functionName: "balanceOf",
        args: [treasuryAddress],
      }),
      client.readContract({
        address: CONTRACTS.dropToken,
        abi: ABIS.dropToken,
        functionName: "totalSupply",
      }),
    ]);

    return {
      chainId: chain.id,
      chainName: chain.name,
      dropTokenAddress: CONTRACTS.dropToken,
      tipRouterAddress: CONTRACTS.tipRouter,
      treasuryAddress,
      treasuryBalanceDrop: formatDropWei(treasuryBalanceWei as bigint),
      totalSupplyDrop: formatDropWei(totalSupplyWei as bigint),
      explorerTreasuryUrl: explorerAddressUrl(treasuryAddress),
      explorerTipRouterUrl: explorerAddressUrl(CONTRACTS.tipRouter),
      explorerDropTokenUrl: explorerAddressUrl(CONTRACTS.dropToken),
    };
  } catch (err) {
    console.warn("[onchain-treasury] RPC read failed:", err);
    return null;
  }
}
