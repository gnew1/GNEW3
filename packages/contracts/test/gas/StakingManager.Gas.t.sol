// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
import "forge-std/Test.sol"; 
import {GnewGovToken} from "../../src/governance/GnewGovToken.sol"; 
import {StakingManager} from "../../src/staking/StakingManager.sol"; 
 
contract StakingManagerGasTest is Test { 
    GnewGovToken gov; 
    StakingManager sm; 
    address dao = address(0xDA0); 
    address oper = address(0x0PER); 
    address alice = address(0xA11CE); 
    address bob = address(0xB0B); 
 
    function setUp() public { 
        gov = new GnewGovToken("GNEW-GOV","gGNEW", address(this), 0, 
1_000_000e18, 0, 0); 
        gov.mint(alice, 1_000e18); 
        gov.mint(bob, 1_000e18); 
 
        sm = new StakingManager(address(gov), dao, dao, 100e18, 3600, 
1800); 
 
        // approvals 
        vm.startPrank(alice); 
        gov.approve(address(sm), type(uint256).max); 
        vm.stopPrank(); 
        vm.startPrank(bob); 
        gov.approve(address(sm), type(uint256).max); 
        vm.stopPrank(); 
 
        // bootstrap: Alice registra operador 
        vm.prank(alice); 
        sm.delegate(oper, 150e18); 
    } 
 
    function gas_delegate_hot() external { 
        vm.pauseGasMetering(); 
        // preparar saldo de Bob 
        vm.resumeGasMetering(); 
        vm.prank(bob); 
        sm.delegate(oper, 50e18); 
    } 
 
    function gas_undelegate_hot() external { 
        vm.pauseGasMetering(); 
        vm.prank(bob); 
        sm.delegate(oper, 50e18); 
        vm.resumeGasMetering(); 
        vm.prank(bob); 
        (uint256 active,) = sm.position(oper, bob); 
        sm.undelegate(oper, active); 
    } 
 
    function gas_claim_hot() external { 
        vm.pauseGasMetering(); 
        vm.prank(bob); 
        sm.delegate(oper, 50e18); 
        (uint256 active,) = sm.position(oper, bob); 
        sm.undelegate(oper, active); 
        vm.warp(block.timestamp + 3605); 
        vm.resumeGasMetering(); 
        vm.prank(bob); 
        sm.claim(oper, 0); 
    } 
 
    function gas_executeSlash_hot() external { 
        vm.pauseGasMetering(); 
        address slasher = address(0x5LA5H); 
        vm.prank(dao); 
        sm.grantRole(sm.SLASHER_ROLE(), slasher); 
        vm.resumeGasMetering(); 
        vm.prank(slasher); 
        sm.proposeSlash(oper, 1000, keccak256("incident")); 
        vm.warp(block.timestamp + 1805); 
        sm.executeSlash(oper, 1); 
    } 
} 
 
