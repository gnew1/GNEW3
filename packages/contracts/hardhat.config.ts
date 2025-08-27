import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      remappings: [
        "@openzeppelin/=lib/openzeppelin-contracts/",
        "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/",
        "@openzeppelin/contracts-upgradeable/=lib/openzeppelin-contracts-upgradeable/contracts/"
      ]
    }
  },
  paths: { sources: "src", tests: "test" },
  typechain: { outDir: "typechain-types", target: "ethers-v6" }
};

export default config;
