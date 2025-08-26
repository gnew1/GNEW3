// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
import "forge-std/Test.sol"; 
import {GnewGovToken} from "../src/governance/GnewGovToken.sol"; 
 
contract GnewGovTokenTest is Test { 
    GnewGovToken gov; 
    address admin = address(0xA11CE); 
    address user = address(0xB0B); 
 
    function setUp() public { 
        gov = new GnewGovToken( 
            "GNEW-GOV", 
            "gGNEW", 
            admin, 
            100e18, 
            1000e18, 
            5e18, 
            3600 
        ); 
    } 
 
    function testCapAndMint() public { 
        vm.prank(admin); 
        gov.mint(user, 900e18); 
        assertEq(gov.totalSupply(), 1000e18); 
        vm.prank(admin); 
        vm.expectRevert(bytes("cap exceeded")); 
        gov.mint(user, 1); 
    } 
 
    function testPauseBlocksTransfers() public { 
        vm.prank(admin); 
        gov.pause(); 
        vm.prank(admin); 
        vm.expectRevert(bytes("paused")); 
        gov.transfer(user, 1); 
    } 
 
    function testFaucetCooldown() public {
        // default chainid in foundry local is testnet-like; faucet
allowed
        vm.prank(user);
        gov.faucet();
        assertEq(gov.balanceOf(user), 5e18);
        vm.prank(user);
        vm.expectRevert(bytes("faucet:cooldown"));
        gov.faucet();
    }
}
