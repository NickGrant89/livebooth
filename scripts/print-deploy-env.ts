#!/usr/bin/env npx tsx
/**
 * Prints env vars from src/lib/contracts/deployed.json for copy-paste into .env
 * Run after: npm run contracts:deploy
 */
import * as fs from "fs";
import * as path from "path";

const deployedPath = path.join(__dirname, "../src/lib/contracts/deployed.json");

if (!fs.existsSync(deployedPath)) {
  console.error("No deployed.json — run npm run contracts:deploy first");
  process.exit(1);
}

const d = JSON.parse(fs.readFileSync(deployedPath, "utf8")) as {
  chainId: number;
  network: string;
  dropToken: string;
  tipRouter: string;
  achievementVault: string;
  deployer: string;
};

console.log("\n# LiveBooth contract addresses (" + d.network + ")\n");
console.log(`NEXT_PUBLIC_CHAIN_ID=${d.chainId}`);
console.log(`NEXT_PUBLIC_DROP_TOKEN_ADDRESS=${d.dropToken}`);
console.log(`NEXT_PUBLIC_TIP_ROUTER_ADDRESS=${d.tipRouter}`);
console.log(`NEXT_PUBLIC_ACHIEVEMENT_VAULT_ADDRESS=${d.achievementVault}`);
if (d.network === "vechainTestnet") {
  console.log(`NEXT_PUBLIC_VECHAIN_RPC_URL=https://rpc-testnet.vechain.energy`);
  console.log(`# CLAIM_SIGNER_PRIVATE_KEY=<same as DEPLOYER_PRIVATE_KEY for dev>`);
}
console.log("");
