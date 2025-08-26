// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {ReputationScore} from "../src/reputation/ReputationScore.sol";

contract ReputationScoreTest is Test {
    ReputationScore rep;
    address admin = address(0xA11CE);
    address user = address(0xB0B);

    function setUp() public {
        rep = new ReputationScore(admin, admin);
    }

    function testSetScoreAndVotes() public {
        vm.prank(admin);
        rep.setScore(user, 42);
        vm.prank(user);
        rep.delegate(user);
        vm.roll(block.number + 1);
        assertEq(rep.getVotes(user), 42);
        assertEq(rep.totalScore(), 42);
    }
}
