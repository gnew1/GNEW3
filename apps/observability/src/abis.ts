import GnewGovToken from 
"@gnew/contracts/artifacts/src/governance/GnewGovToken.sol/GnewGovToke
 n.json" assert { type: "json" }; 
import GnewToken from 
"@gnew/contracts/artifacts/src/GnewToken.sol/GnewToken.json" assert { 
type: "json" }; 
import StakingManager from 
"@gnew/contracts/artifacts/src/staking/StakingManager.sol/StakingManag
 er.json" assert { type: "json" }; 
export const ABIS: Record<string, any> = { 
GnewGovToken, 
GnewToken, 
StakingManager 
}; 
