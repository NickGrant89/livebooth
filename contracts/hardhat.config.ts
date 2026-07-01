import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@vechain/sdk-hardhat-plugin";
import * as dotenv from "dotenv";
import path from "path";
import { type HttpNetworkConfig } from "hardhat/types";

dotenv.config({ path: path.join(__dirname, "../.env") });

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const deployerAccounts = deployerKey.startsWith("0x") ? [deployerKey] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "shanghai",
    },
  },
  paths: {
    sources: "./src",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {},
    // VeChainThor uses blockRef/chainTag — not Ethereum nonces. The official plugin
    // talks to testnet.vechain.org directly; do not deploy via the JSON-RPC proxy.
    vechainTestnet: {
      url: process.env.VECHAIN_TESTNET_NODE_URL ?? "https://testnet.vechain.org",
      accounts: deployerAccounts,
      debug: true,
      gasPayer: undefined,
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1,
      timeout: 60_000,
      httpHeaders: {},
    } satisfies HttpNetworkConfig,
    vechainMainnet: {
      url: process.env.VECHAIN_MAINNET_NODE_URL ?? "https://mainnet.vechain.org",
      accounts: deployerAccounts,
      debug: false,
      gasPayer: undefined,
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1,
      timeout: 60_000,
      httpHeaders: {},
    } satisfies HttpNetworkConfig,
  },
};

export default config;
