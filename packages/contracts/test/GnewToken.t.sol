// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
import "forge-std/Test.sol"; 
import {GnewToken} from "../src/GnewToken.sol"; 
 
contract GnewTokenTest is Test { 
    GnewToken token; 
    address owner = address(0xA11CE); 
    address user = address(0xB0B); 
 
    function setUp() public { 
        token = new GnewToken("GNEW", "GNEW", owner, 1_000e18); 
    } 
 
    function testInitialSupply() public { 
        assertEq(token.balanceOf(owner), 1_000e18); 
        assertEq(token.totalSupply(), 1_000e18); 
    } 
 
    function testRoles() public { 
        bytes32 minter = token.MINTER_ROLE(); 
        bytes32 pauser = token.PAUSER_ROLE(); 
        assertTrue(token.hasRole(minter, owner)); 
        assertTrue(token.hasRole(pauser, owner)); 
    } 
 
    function testMintAndBurn() public { 
        vm.prank(owner); 
        token.mint(user, 10e18); 
        assertEq(token.balanceOf(user), 10e18); 
 
        vm.prank(user); 
        token.burn(4e18); 
        assertEq(token.balanceOf(user), 6e18); 
    } 
 
    function testPauseBlocksTransfers() public { 
        vm.prank(owner); 
        token.mint(user, 1e18); 
 
        vm.prank(owner); 
        token.pause(); 
 
        vm.prank(user); 
        vm.expectRevert(bytes("paused")); 
        token.transfer(address(0xC0DE), 1); 
 
        vm.prank(owner); 
        token.unpause(); 
 
        vm.prank(user); 
        token.transfer(address(0xC0DE), 1); 
        assertEq(token.balanceOf(address(0xC0DE)), 1); 
    } 
} 
 
