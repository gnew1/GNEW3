import "dotenv/config"; 
import { HardhatUserConfig } from "hardhat/config"; 
import "@nomicfoundation/hardhat-toolbox"; 
import "@nomicfoundation/hardhat-verify"; 
import "solidity-coverage"; 
import "hardhat-gas-reporter"; 
 
const PRIVATE_KEY = process.env.PRIVATE_KEY ? 
[process.env.PRIVATE_KEY] : []; 
 
const config: HardhatUserConfig = { 
  solidity: { 
    version: "0.8.24", 
    settings: { 
      optimizer: { enabled: true, runs: 200 } 
    } 
  }, 
  paths: {
    sources: "src_min",
  },
  mocha: { timeout: 120_000 }, 
  networks: { 
    hardhat: {}, 
    anvil: { 
      url: "http://127.0.0.1:8545", 
      chainId: 31337, 
      accounts: PRIVATE_KEY 
    }, 
    goerli: { 
      url: process.env.GOERLI_RPC_URL || "", 
      chainId: 5, 
      accounts: PRIVATE_KEY 
    }, 
    holesky: { 
      url: process.env.HOLESKY_RPC_URL || "", 
      chainId: 17000, 
      accounts: PRIVATE_KEY 
    }, 
    polygonAmoy: { 
      url: process.env.AMOY_RPC_URL || "", 
      chainId: 80002, 
      accounts: PRIVATE_KEY 
    } 
  }, 
  etherscan: { 
    apiKey: { 
      // Etherscan soporta Holesky 
      holesky: process.env.ETHERSCAN_API_KEY || "", 
      goerli: process.env.ETHERSCAN_API_KEY || "", 
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "" 
    } 
  }, 
  gasReporter: { 
    enabled: true, 
    currency: "USD", 
    coinmarketcap: process.env.CMC_API_KEY || undefined, 
    excludeContracts: ["mocks/"] 
  }, 
  typechain: { 
    outDir: "typechain-types", 
    target: "ethers-v6" 
  } 
}; 
 
export default config; 
 
