
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../Governance.sol";

/// @notice Pruebas formales/fuzzing para Governance.sol
contract GovernanceProperties is Test {
    Governance gov;

    function setUp() public {
        gov = new Governance();
    }

    /// @dev Propiedad: no se pueden emitir votos sin poder asignado
    function testFuzz_voteRequiresPower(address voter, bytes32 proposal, bool support) public {
        vm.startPrank(voter);
        vm.expectRevert("No power");
        gov.vote(proposal, support);
        vm.stopPrank();
    }

    /// @dev Propiedad: el total de votos nunca disminuye
    function testFuzz_monotonicVotes(address voter, bytes32 proposal, bool support) public {
        gov.setVotingPower(voter, 10);
        uint256 beforeFor = gov.votesFor(proposal);
        uint256 beforeAgainst = gov.votesAgainst(proposal);

        vm.prank(voter);
        gov.vote(proposal, support);

        if (support) {
            assertGe(gov.votesFor(proposal), beforeFor);
        } else {
            assertGe(gov.votesAgainst(proposal), beforeAgainst);
        }
    }
}


