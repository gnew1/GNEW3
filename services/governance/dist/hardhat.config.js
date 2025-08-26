import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();
const ALCHEMY = process.env.ALCHEMY_URL || "";
const PK = process.env.DEPLOYER_PK || "0x".padEnd(66, "0");
const config = {
    solidity: {
        version: "0.8.20",
        settings: { optimizer: { enabled: true, runs: 200 } },
    },
    networks: {
        hardhat: { chainId: 31337 },
        fork: {
            url: ALCHEMY,
            accounts: [PK],
            chainId: 1
        },
        mainnet: { url: ALCHEMY, accounts: [PK] }
    }
};
export default config;
