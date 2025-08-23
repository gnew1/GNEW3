import { HardhatUserConfig } from "hardhat/config"; 
import "@nomicfoundation/hardhat-toolbox"; 
 
const config: HardhatUserConfig = { 
  solidity: "0.8.24", 
  networks: { 
    gnewchain: { url: process.env.RPC_URL!, accounts: 
[process.env.ANCHOR_PK!] } 
  } 
}; 
export default config; 
 
 
Frontend — Centro de permisos 
