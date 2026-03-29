import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-viem";

import type { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
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
    sources: "contracts",
    tests: "contracts/test",
    cache: "contracts/cache",
    artifacts: "contracts/artifacts",
  },
};

export default config;
