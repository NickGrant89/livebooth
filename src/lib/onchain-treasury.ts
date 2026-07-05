import { createPublicClient, http, type Address } from "viem";
import { CONTRACTS, ABIS, contractsConfigured, formatDropWei } from "./web3/contracts";
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

export async function getOnChainTreasuryStats(): Promise<OnChainTreasuryStats | null> {
  if (!contractsConfigured()) return null;

  const chain = getChain();
  const rpc =
    process.env.VECHAIN_TESTNET_RPC_URL ??
    process.env.NEXT_PUBLIC_VECHAIN_RPC_URL ??
    chain.rpcUrls.default.http[0];

  const client = createPublicClient({
    chain,
    transport: http(rpc),
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
}
