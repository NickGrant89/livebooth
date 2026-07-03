/** VeChain Kit sponsored fee delegator URLs (testnet gas sponsorship for embedded wallets). */

const TESTNET_DELEGATOR = "https://sponsor-testnet.vechain.energy/by/221";
const MAINNET_DELEGATOR = "https://sponsor.vechain.energy/by/1060";

export function sponsoredDelegatorUrl(): string {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 100010);
  return chainId === 100009 ? MAINNET_DELEGATOR : TESTNET_DELEGATOR;
}
