// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/zk/BallotZK.sol";
import "../../src/zk/verifiers/MockGroth16Verifier.sol";

contract BallotZKTest is Test {
    MockGroth16Verifier mock;
    BallotZK ballot;

    function setUp() public {
        mock = new MockGroth16Verifier(true);
        ballot = new BallotZK(mock, bytes32(uint256(123)), 4);
    }

    function test_vote_success() public {
        uint[2] memory a = [uint(0), uint(0)];
        uint[2][2] memory b = [[uint(0), uint(0)], [uint(0), uint(0)]];
        uint[2] memory c = [uint(0), uint(0)];
        uint;
        signals[0] = 123;      // root
        signals[1] = 777;      // nullifierHash
        signals[2] = 1;        // option

        ballot.vote(a, b, c, signals);
        assertTrue(ballot.hasVoted(bytes32(uint256(777))));
    }

    function test_reject_replay() public {
        uint[2] memory a; uint[2][2] memory b; uint[2] memory c;
        uint;
        signals[0] = 123; signals[1] = 888; signals[2] = 2;
        ballot.vote(a, b, c, signals);
        vm.expectRevert();
        ballot.vote(a, b, c, signals);
    }

    function test_wrong_root() public {
        uint[2] memory a; uint[2][2] memory b; uint[2] memory c;
        uint;
        signals[0] = 124; signals[1] = 999; signals[2] = 1;
        vm.expectRevert();
        ballot.vote(a, b, c, signals);
    }
}

