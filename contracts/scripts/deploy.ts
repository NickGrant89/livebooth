import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying LiveBooth contracts with:", deployer.address);

  const network = await ethers.provider.getNetwork();
  const faucetEnabled = Number(network.chainId) === 100010;

  const DropToken = await ethers.getContractFactory("DropToken");
  const drop = await DropToken.deploy(faucetEnabled);
  await drop.waitForDeployment();
  const dropAddress = await drop.getAddress();
  console.log("DropToken:", dropAddress);

  const TipRouter = await ethers.getContractFactory("TipRouter");
  const tipRouter = await TipRouter.deploy(dropAddress, deployer.address);
  await tipRouter.waitForDeployment();
  const tipRouterAddress = await tipRouter.getAddress();
  console.log("TipRouter:", tipRouterAddress);

  const AchievementVault = await ethers.getContractFactory("AchievementVault");
  const vault = await AchievementVault.deploy(dropAddress, deployer.address);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("AchievementVault:", vaultAddress);

  const fundAmount = ethers.parseEther("1000000");
  await drop.approve(vaultAddress, fundAmount);
  await vault.fund(fundAmount);
  console.log("Vault funded with 1M DROP");

  console.log("Faucet enabled:", faucetEnabled);

  const addresses = {
    chainId: Number(network.chainId),
    network:
      Number(network.chainId) === 100010
        ? "vechainTestnet"
        : Number(network.chainId) === 100009
          ? "vechainMainnet"
          : "local",
    dropToken: dropAddress,
    tipRouter: tipRouterAddress,
    achievementVault: vaultAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    faucetEnabled,
  };

  const outDir = path.join(__dirname, "../../src/lib/contracts");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "deployed.json"), JSON.stringify(addresses, null, 2));

  const artifactNames = ["DropToken", "TipRouter", "AchievementVault"];
  for (const name of artifactNames) {
    const artifactPath = path.join(__dirname, `../artifacts/src/${name}.sol/${name}.json`);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.writeFileSync(path.join(outDir, `${name}.abi.json`), JSON.stringify(artifact.abi, null, 2));
  }

  // Remove legacy BEAT artifacts if present
  for (const legacy of ["BeatToken.abi.json"]) {
    const p = path.join(outDir, legacy);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  console.log("\nAddresses written to src/lib/contracts/deployed.json");
  console.log("Add to .env:");
  console.log(`NEXT_PUBLIC_CHAIN_ID=${addresses.chainId}`);
  console.log(`NEXT_PUBLIC_DROP_TOKEN_ADDRESS=${dropAddress}`);
  console.log(`NEXT_PUBLIC_TIP_ROUTER_ADDRESS=${tipRouterAddress}`);
  console.log(`NEXT_PUBLIC_ACHIEVEMENT_VAULT_ADDRESS=${vaultAddress}`);
  console.log(`CLAIM_SIGNER_PRIVATE_KEY=<deployer key for dev>`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
