// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
import "forge-std/Script.sol"; 
import {GnewGovToken} from "../src/governance/GnewGovToken.sol"; 
 
contract DeployGovScript is Script { 
    function run() external { 
        address admin = vm.envAddress("OWNER_ADDRESS"); 
        uint256 initial = vm.envUint("INITIAL_SUPPLY"); 
        uint256 cap = vm.envUint("MAX_SUPPLY"); 
        uint256 faucetAmount = vm.envUint("FAUCET_AMOUNT"); 
        uint256 faucetCooldown = vm.envUint("FAUCET_COOLDOWN"); 
        vm.startBroadcast(); 
        new 
GnewGovToken("GNEW-GOV","gGNEW",admin,initial,cap,faucetAmount,faucetC
 ooldown); 
        vm.stopBroadcast(); 
    } 
} 
 
