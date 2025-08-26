// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {StakingManager} from "../src/staking/StakingManager.sol";
import {TokenVotesMock} from "../src/mocks/TokenVotesMock.sol";

contract StakingManagerTest is Test {
    TokenVotesMock token;
    StakingManager manager;
    address admin = address(0xA11CE);
    address operator = address(0xB0B);
    address delegator = address(0xC0DE);

    function setUp() public {
        token = new TokenVotesMock();
        token.mint(delegator, 100e18);
        manager = new StakingManager(address(token), admin, admin, 1e18, 1, 0);
        vm.prank(delegator);
        token.approve(address(manager), type(uint256).max);
    }

    function testDelegateUndelegateClaim() public {
        vm.prank(delegator);
        manager.delegate(operator, 10e18);
        (uint256 activeShares, ) = manager.position(operator, delegator);
        assertEq(activeShares, 10e18);

        vm.prank(delegator);
        manager.undelegate(operator, 10e18);
        (activeShares, StakingManager.Unbonding[] memory unbonds) = manager.position(operator, delegator);
        assertEq(activeShares, 0);
        assertEq(unbonds.length, 1);

        vm.warp(block.timestamp + 2);
        vm.prank(delegator);
        manager.claim(operator, 0);
        assertEq(token.balanceOf(delegator), 100e18);
    }
}
