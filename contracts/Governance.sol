
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Governance - contrato crítico sujeto a verificación formal (M2)
/// @notice Simplificado para ilustrar propiedades formales a verificar.
contract Governance {
    mapping(address => uint256) public votingPower;
    mapping(bytes32 => uint256) public votesFor;
    mapping(bytes32 => uint256) public votesAgainst;

    uint256 public constant QUORUM = 1000;

    event ProposalVoted(bytes32 indexed proposalId, address indexed voter, bool support);

    function setVotingPower(address voter, uint256 power) external {
        votingPower[voter] = power;
    }

    function vote(bytes32 proposalId, bool support) external {
        uint256 power = votingPower[msg.sender];
        require(power > 0, "No power");
        if (support) {
            votesFor[proposalId] += power;
        } else {
            votesAgainst[proposalId] += power;
        }
        emit ProposalVoted(proposalId, msg.sender, support);
    }

    function proposalPassed(bytes32 proposalId) external view returns (bool) {
        uint256 total = votesFor[proposalId] + votesAgainst[proposalId];
        if (total < QUORUM) return false;
        return votesFor[proposalId] > votesAgainst[proposalId];
    }
}


