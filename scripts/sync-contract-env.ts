#!/usr/bin/env npx tsx
/**
 * Writes contract addresses from deployed.json into .env
 * Usage: npm run contracts:sync-env
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DEPLOYED = path.join(ROOT, "src/lib/contracts/deployed.json");
const ENV_PATH = path.join(ROOT, ".env");
const ENV_EXAMPLE = path.join(ROOT, ".env.example");

function upsertEnv(content: string, key: string, value: string) {
  const line = `${key}="${value}"`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) return content.replace(re, line);
  return content.trimEnd() + `\n${line}\n`;
}

if (!fs.existsSync(DEPLOYED)) {
  console.error("No deployed.json — run npm run contracts:deploy first");
  process.exit(1);
}

const d = JSON.parse(fs.readFileSync(DEPLOYED, "utf8")) as {
  chainId: number;
  network: string;
  dropToken: string;
  tipRouter: string;
  achievementVault: string;
};

let content = fs.existsSync(ENV_PATH)
  ? fs.readFileSync(ENV_PATH, "utf8")
  : fs.readFileSync(ENV_EXAMPLE, "utf8");

content = upsertEnv(content, "NEXT_PUBLIC_CHAIN_ID", String(d.chainId));
content = upsertEnv(content, "NEXT_PUBLIC_DROP_TOKEN_ADDRESS", d.dropToken);
content = upsertEnv(content, "NEXT_PUBLIC_TIP_ROUTER_ADDRESS", d.tipRouter);
content = upsertEnv(content, "NEXT_PUBLIC_ACHIEVEMENT_VAULT_ADDRESS", d.achievementVault);

if (d.network === "vechainTestnet") {
  content = upsertEnv(content, "NEXT_PUBLIC_VECHAIN_RPC_URL", "https://rpc-testnet.vechain.energy");
}

fs.writeFileSync(ENV_PATH, content);

console.log(`\n✓ Synced ${d.network} contract addresses to .env`);
console.log(`  DROP:   ${d.dropToken}`);
console.log(`  Router: ${d.tipRouter}`);
console.log(`  Vault:  ${d.achievementVault}`);
console.log(`\nRestart dev server: npm run demo:start\n`);
