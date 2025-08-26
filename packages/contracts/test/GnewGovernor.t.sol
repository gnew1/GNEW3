// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {GnewGovernor} from "../src/governance/GnewGovernor.sol";
import {ReputationScore} from "../src/reputation/ReputationScore.sol";
import {TokenVotesMock} from "../src/mocks/TokenVotesMock.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

contract GnewGovernorTest is Test {
    TokenVotesMock token;
    ReputationScore rep;
    GnewGovernor governor;

    address admin = address(0xA11CE);
    address voter = address(0xB0B);

    function setUp() public {
        token = new TokenVotesMock();
        token.mint(voter, 100e18);
        vm.prank(voter);
        token.delegate(voter);

        rep = new ReputationScore(admin, admin);
        vm.prank(admin);
        rep.setScore(voter, 100);
        vm.prank(voter);
        rep.delegate(voter);

        vm.roll(2); // ensure votes are checkpointed

        governor = new GnewGovernor(
            IVotes(address(token)),
            IVotes(address(rep)),
            7000,
            3000,
            100,
            1,
            10,
            0
        );
    }

    function testProposeAndVote() public {
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        targets[0] = address(0);
        values[0] = 0;
        calldatas[0] = "";

        vm.prank(voter);
        uint256 proposalId = governor.propose(targets, values, calldatas, "test");

        vm.roll(block.number + 1); // start voting

        vm.prank(voter);
        governor.castVote(proposalId, 1); // For

        vm.roll(block.number + 10); // end voting period
        assertEq(uint256(governor.state(proposalId)), 4); // Succeeded
    }
}
