import DropTokenAbi from "@/lib/contracts/DropToken.abi.json";
import TipRouterAbi from "@/lib/contracts/TipRouter.abi.json";
import AchievementVaultAbi from "@/lib/contracts/AchievementVault.abi.json";
import deployed from "@/lib/contracts/deployed.json";

export const CONTRACTS = {
  dropToken: (process.env.NEXT_PUBLIC_DROP_TOKEN_ADDRESS ??
    (deployed as { dropToken?: string }).dropToken ??
    (deployed as { beatToken?: string }).beatToken) as `0x${string}`,
  tipRouter: (process.env.NEXT_PUBLIC_TIP_ROUTER_ADDRESS ?? deployed.tipRouter) as `0x${string}`,
  achievementVault: (process.env.NEXT_PUBLIC_ACHIEVEMENT_VAULT_ADDRESS ??
    deployed.achievementVault) as `0x${string}`,
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? deployed.chainId),
};

export const ABIS = {
  dropToken: DropTokenAbi,
  tipRouter: TipRouterAbi,
  achievementVault: AchievementVaultAbi,
} as const;

export function contractsConfigured(): boolean {
  return Boolean(
    CONTRACTS.dropToken &&
      CONTRACTS.tipRouter &&
      CONTRACTS.achievementVault &&
      !CONTRACTS.dropToken.startsWith("0x0000"),
  );
}

/** Kill switch — set NEXT_PUBLIC_ONCHAIN_ENABLED=false to hide wallet / on-chain UX (beta). */
export function isOnChainEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ONCHAIN_ENABLED !== "false";
}

/** Contracts deployed and on-chain features not disabled. */
export function onChainFeaturesAvailable(): boolean {
  return isOnChainEnabled() && contractsConfigured();
}

export function parseDrop(amount: number): bigint {
  return BigInt(Math.floor(amount)) * BigInt(10 ** 18);
}

/** @deprecated use parseDrop */
export const parseBeat = parseDrop;

export function formatDropWei(wei: bigint): number {
  return Number(wei / BigInt(10 ** 18));
}

/** @deprecated use formatDropWei */
export const formatBeatWei = formatDropWei;
