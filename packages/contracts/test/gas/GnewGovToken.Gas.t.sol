// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
import "forge-std/Test.sol"; 
import {GnewGovToken} from "../../src/governance/GnewGovToken.sol"; 
 
contract GnewGovTokenGasTest is Test { 
    GnewGovToken gov; 
    address admin = address(this); 
    address user = address(0xB0B); 
 
    function setUp() public { 
        gov = new GnewGovToken("GNEW-GOV","gGNEW", admin, 0, 
1_000_000e18, 0, 0); 
        gov.mint(user, 10e18); 
    } 
 
    function gas_transfer_hot() external { 
        vm.prank(user); 
        gov.transfer(address(0xC0DE), 1 ether); 
    } 
 
    function gas_mint_hot() external { 
        gov.mint(user, 1e18); 
} 
} 
/packages/contracts/foundry.toml (amplía gas report a contratos hotspot) 
[profile.default] 
src = "src" 
out = "out" 
test = "test" 
libs = ["lib"] 
solc_version = "0.8.24" 
evm_version = "paris" 
optimizer = true 
optimizer_runs = 200 
fs_permissions = [{ access = "read", path = "./"}] 
gas_reports = ["GnewGovToken","StakingManager"] 
