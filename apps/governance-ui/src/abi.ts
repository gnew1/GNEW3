import Governor from 
"@gnew/contracts/artifacts/src/governance/GnewGovernorTimelocked.sol/G
 newGovernorTimelocked.json" assert { type: "json" }; 
import Timelock from 
"@openzeppelin/contracts/build/contracts/TimelockController.json" 
assert { type: "json" }; 
export const ABIS = { 
Governor: Governor.abi, 
  Timelock: Timelock.abi 
}; 
 
