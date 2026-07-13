#!/usr/bin/env npx tsx
/**
 * Check Safe DROP balance on VeChain testnet (before/after on-chain tip test).
 * Usage: npm run contracts:check-safe
 */
import "dotenv/config";
import { createPublicClient, http, formatEther } from "viem";
import { vechainTestnet } from "../src/lib/web3/chains";
import DropTokenAbi from "../src/lib/contracts/DropToken.abi.json";
import deployed from "../src/lib/contracts/deployed.json";

const SAFE =
  process.env.SAFE_ADDRESS?.trim() ?? "0xA6C4d7E73BEf94a36957D9493605d319Ab31521B";
const DROP = (process.env.NEXT_PUBLIC_DROP_TOKEN_ADDRESS ??
  deployed.dropToken) as `0x${string}`;
const TIP_ROUTER = (process.env.NEXT_PUBLIC_TIP_ROUTER_ADDRESS ??
  deployed.tipRouter) as `0x${string}`;
const RPC =
  process.env.NEXT_PUBLIC_VECHAIN_RPC_URL ?? "https://rpc-testnet.vechain.energy";

async function main() {
  const client = createPublicClient({
    chain: vechainTestnet,
    transport: http(RPC),
  });

  const treasury = await client.readContract({
    address: TIP_ROUTER,
    abi: [
      {
        type: "function",
        name: "platformTreasury",
        inputs: [],
        outputs: [{ type: "address" }],
        stateMutability: "view",
      },
    ],
    functionName: "platformTreasury",
  });

  const safeBal = await client.readContract({
    address: DROP,
    abi: DropTokenAbi,
    functionName: "balanceOf",
    args: [SAFE as `0x${string}`],
  });

  console.log("\nLiveBooth on-chain tip test — Safe balance\n");
  console.log("DropToken:  ", DROP);
  console.log("TipRouter:  ", TIP_ROUTER);
  console.log("Treasury:   ", treasury);
  console.log("Safe:       ", SAFE);
  console.log("Safe DROP:  ", formatEther(safeBal as bigint));
  console.log(
    "\nExplorer:",
    `https://explore.vechain.org/accounts/${SAFE}?network=test`,
  );
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
