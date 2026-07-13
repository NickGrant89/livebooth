/**
 * Wire a VeChain Safe as platform treasury + contract owner (testnet/mainnet).
 *
 * Usage:
 *   SAFE_ADDRESS=0x... npx hardhat run scripts/wire-safe-treasury.ts --network vechainTestnet
 */
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const SAFE = process.env.SAFE_ADDRESS?.trim();
if (!SAFE || !/^0x[a-fA-F0-9]{40}$/.test(SAFE)) {
  console.error("Set SAFE_ADDRESS=0x... (checksum ok)");
  process.exit(1);
}

async function main() {
  const deployedPath = path.join(__dirname, "../../src/lib/contracts/deployed.json");
  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8")) as {
    tipRouter: string;
    achievementVault: string;
    dropToken?: string;
  };

  const [signer] = await ethers.getSigners();
  console.log("Deployer:", signer.address);
  console.log("Safe:    ", SAFE);

  const tipRouter = await ethers.getContractAt("TipRouter", deployed.tipRouter);
  const vault = await ethers.getContractAt("AchievementVault", deployed.achievementVault);

  const tipOwner = await tipRouter.owner();
  const vaultOwner = await vault.owner();
  const treasury = await tipRouter.platformTreasury();

  console.log("\nBefore:");
  console.log("  TipRouter.owner():", tipOwner);
  console.log("  TipRouter.platformTreasury():", treasury);
  console.log("  AchievementVault.owner():", vaultOwner);

  if (tipOwner.toLowerCase() !== signer.address.toLowerCase()) {
    console.error("\nDeployer is not TipRouter owner — use the current owner wallet or Safe UI.");
    process.exit(1);
  }

  if (treasury.toLowerCase() !== SAFE!.toLowerCase()) {
    console.log("\n→ setPlatformTreasury...");
    const tx1 = await tipRouter.setPlatformTreasury(SAFE!);
    await tx1.wait();
    console.log("  ✓", tx1.hash);
  } else {
    console.log("\n✓ platformTreasury already set to Safe");
  }

  if (tipOwner.toLowerCase() !== SAFE!.toLowerCase()) {
    console.log("→ TipRouter.transferOwnership...");
    const tx2 = await tipRouter.transferOwnership(SAFE!);
    await tx2.wait();
    console.log("  ✓", tx2.hash);
  } else {
    console.log("✓ TipRouter already owned by Safe");
  }

  if (vaultOwner.toLowerCase() !== SAFE!.toLowerCase()) {
    if (vaultOwner.toLowerCase() !== signer.address.toLowerCase()) {
      console.error("Deployer is not AchievementVault owner.");
      process.exit(1);
    }
    console.log("→ AchievementVault.transferOwnership...");
    const tx3 = await vault.transferOwnership(SAFE!);
    await tx3.wait();
    console.log("  ✓", tx3.hash);
  } else {
    console.log("✓ AchievementVault already owned by Safe");
  }

  console.log("\nAfter:");
  console.log("  TipRouter.owner():", await tipRouter.owner());
  console.log("  TipRouter.platformTreasury():", await tipRouter.platformTreasury());
  console.log("  AchievementVault.owner():", await vault.owner());
  console.log("\n10% of on-chain tips now go to the Safe.");
  console.log("Owner actions (setClaimSigner, etc.) must be done via Safe UI.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
