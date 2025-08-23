
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * GNEW Project - Governance Smart Contract
 * Prompt N313
 * Implements weighted voting using GNEW and GNEW0 tokens.
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/IGnewToken.sol";
import "./interfaces/IGnew0Token.sol";

contract GnewGovernance is Ownable {
    using EnumerableSet for EnumerableSet.UintSet;

    struct Proposal {
        string description;
        uint256 deadline;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) private proposals;

    IGnewToken public gnewToken;
    IGnew0Token public gnew0Token;

    event ProposalCreated(uint256 indexed id, string description, uint256 deadline);
    event VoteCast(address indexed voter, uint256 indexed id, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed id, bool success);

    constructor(address _gnewToken, address _gnew0Token) {
        gnewToken = IGnewToken(_gnewToken);
        gnew0Token = IGnew0Token(_gnew0Token);
    }

    modifier onlyActive(uint256 proposalId) {
        require(block.timestamp < proposals[proposalId].deadline, "Proposal closed");
        _;
    }

    function createProposal(string memory description, uint256 duration) external onlyOwner {
        proposalCount++;
        Proposal storage p = proposals[proposalCount];
        p.description = description;
        p.deadline = block.timestamp + duration;
        emit ProposalCreated(proposalCount, description, p.deadline);
    }

    function vote(uint256 proposalId, bool support) external onlyActive(proposalId) {
        Proposal storage p = proposals[proposalId];
        require(!p.hasVoted[msg.sender], "Already voted");

        uint256 weight = gnewToken.balanceOf(msg.sender) + (gnew0Token.balanceOf(msg.sender) / 10);
        require(weight > 0, "No voting power");

        if (support) {
            p.forVotes += weight;
        } else {
            p.againstVotes += weight;
        }

        p.hasVoted[msg.sender] = true;

        emit VoteCast(msg.sender, proposalId, support, weight);
    }

    function executeProposal(uint256 proposalId) external onlyOwner {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp >= p.deadline, "Voting not ended");
        require(!p.executed, "Already executed");

        p.executed = true;
        bool success = p.forVotes > p.againstVotes;

        emit ProposalExecuted(proposalId, success);
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            string memory description,
            uint256 deadline,
            uint256 forVotes,
            uint256 againstVotes,
            bool executed
        )
    {
        Proposal storage p = proposals[proposalId];
        return (p.description, p.deadline, p.forVotes, p.againstVotes, p.executed);
    }
}


