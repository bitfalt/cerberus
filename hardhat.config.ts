import { defineConfig } from "hardhat/config";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import hardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import hardhatViemAssertions from "@nomicfoundation/hardhat-viem-assertions";
import hardhatVerify from "@nomicfoundation/hardhat-verify";

const baseSepoliaRpcUrl = process.env.BASE_SEPOLIA_RPC_URL ?? process.env.BASE_RPC_URL ?? "https://sepolia.base.org";
const deployerKey = process.env.CERBERUS_SIGNER_PRIVATE_KEY;

export default defineConfig({
  plugins: [hardhatViem, hardhatViemAssertions, hardhatNodeTestRunner, hardhatNetworkHelpers, hardhatVerify],
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: {
      nodejs: "./contracts/test",
    },
    cache: "./contracts/cache",
    artifacts: "./contracts/artifacts",
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    baseSepolia: {
      type: "http",
      chainType: "l1",
      url: baseSepoliaRpcUrl,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
});
