/**
 * Verify LiveBooth VeChain testnet deployment from .env + deployed.json
 * Usage: npm run contracts:verify
 */
import "dotenv/config";
import { createPublicClient, http, formatEther } from "viem";
import { readFileSync, existsSync } from "fs";
import path from "path";
import deployed from "../src/lib/contracts/deployed.json";
import DropTokenAbi from "../src/lib/contracts/DropToken.abi.json";

const RPC =
  process.env.NEXT_PUBLIC_VECHAIN_RPC_URL ?? "https://rpc-testnet.vechain.energy";
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? deployed.chainId);

const drop =
  (process.env.NEXT_PUBLIC_DROP_TOKEN_ADDRESS as `0x${string}`) ??
  (deployed.dropToken as `0x${string}`);
const tipRouter =
  (process.env.NEXT_PUBLIC_TIP_ROUTER_ADDRESS as `0x${string}`) ??
  (deployed.tipRouter as `0x${string}`);
const vault =
  (process.env.NEXT_PUBLIC_ACHIEVEMENT_VAULT_ADDRESS as `0x${string}`) ??
  (deployed.achievementVault as `0x${string}`);

async function main() {
  console.log("LiveBooth VeChain testnet verification\n");
  console.log("RPC:", RPC);
  console.log("Chain ID (env):", CHAIN_ID);

  const client = createPublicClient({ transport: http(RPC) });
  const onChainId = Number(await client.getChainId());
  console.log("Chain ID (RPC):", onChainId);
  if (onChainId !== 100010) {
    console.warn("⚠ Expected testnet chain ID 100010");
  }

  for (const [label, addr] of [
    ["DropToken", drop],
    ["TipRouter", tipRouter],
    ["AchievementVault", vault],
  ] as const) {
    const code = await client.getBytecode({ address: addr });
    const ok = code && code !== "0x";
    console.log(`${ok ? "✓" : "✗"} ${label}: ${addr}${ok ? "" : " (no code)"}`);
  }

  const symbol = await client.readContract({
    address: drop,
    abi: DropTokenAbi,
    functionName: "symbol",
  });
  console.log("\nToken symbol:", symbol);

  const deployer = deployed.deployer as `0x${string}`;
  const bal = await client.readContract({
    address: drop,
    abi: DropTokenAbi,
    functionName: "balanceOf",
    args: [deployer],
  });
  console.log("Deployer DROP:", formatEther(bal as bigint));

  const envPath = path.join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    const envText = readFileSync(envPath, "utf8");
    const checks = [
      "NEXT_PUBLIC_DROP_TOKEN_ADDRESS",
      "NEXT_PUBLIC_TIP_ROUTER_ADDRESS",
      "NEXT_PUBLIC_ACHIEVEMENT_VAULT_ADDRESS",
      "NEXT_PUBLIC_CHAIN_ID",
    ];
    console.log("\n.env:");
    for (const key of checks) {
      console.log(`  ${envText.includes(key) ? "✓" : "✗"} ${key}`);
    }
  }

  console.log("\nExplorer: https://explore.vechain.org/ (toggle Testnet)");
  console.log("DropToken:", drop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
