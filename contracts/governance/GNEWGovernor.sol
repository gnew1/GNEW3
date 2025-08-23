// SPDX-License-Identifier: GPL-3.0-or-later 
pragma solidity ^0.8.20; 
import {Governor} from 
"@openzeppelin/contracts/governance/Governor.sol"; 
import {GovernorSettings} from 
"@openzeppelin/contracts/governance/extensions/GovernorSettings.sol"; 
import {GovernorCountingSimple} from 
"@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.
 sol"; 
import {GovernorVotes} from 
"@openzeppelin/contracts/governance/extensions/GovernorVotes.sol"; 
import {GovernorVotesQuorumFraction} from 
"@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFrac
 tion.sol"; 
import {GovernorTimelockControl} from 
"@openzeppelin/contracts/governance/extensions/GovernorTimelockControl
 .sol"; 
import {IVotes} from 
"@openzeppelin/contracts/governance/utils/IVotes.sol"; 
contract GNEWGovernor is 
Governor, 
GovernorSettings, 
GovernorCountingSimple, 
GovernorVotes, 
GovernorVotesQuorumFraction, 
GovernorTimelockControl 
{ 
/// @notice Dirección con capacidad de veto 
(seguridad/legal/guardian). 
address public vetoer; 
mapping(uint256 => bool) private _vetoed; 
 
    event VetoerChanged(address indexed oldVetoer, address indexed 
newVetoer); 
    event Vetoed(uint256 indexed proposalId, string reason); 
 
    modifier onlyVetoer() { require(msg.sender == vetoer, "not 
vetoer"); _; } 
 
    constructor( 
        IVotes _token, 
        address _timelock, 
        address _vetoer, 
        uint48 votingDelayBlocks,     // p.ej. ~1 día 
        uint32 votingPeriodBlocks,    // p.ej. ~7 días 
        uint256 proposalThresholdVotes, 
        uint256 quorumPercent          // p.ej. 4 = 4% 
    ) 
        Governor("GNEW Governor") 
        GovernorSettings(votingDelayBlocks, votingPeriodBlocks, 
proposalThresholdVotes) 
        GovernorVotes(_token) 
        GovernorVotesQuorumFraction(quorumPercent) 
        GovernorTimelockControl(GNEWTimelock(payable(_timelock))) 
    { 
        vetoer = _vetoer; 
    } 
 
    function setVetoer(address newVetoer) external onlyVetoer { 
        require(newVetoer != address(0), "zero"); 
        emit VetoerChanged(vetoer, newVetoer); 
        vetoer = newVetoer; 
    } 
 
    /// @notice Veto (cancelación) de una propuesta activa o 
pendiente. 
    function veto(uint256 proposalId, string calldata reason) external 
onlyVetoer { 
        require(!_vetoed[proposalId], "already vetoed"); 
        Governor.ProposalState st = state(proposalId); 
        require(st == ProposalState.Pending || st == 
ProposalState.Active, "bad state"); 
        _vetoed[proposalId] = true; 
        emit Vetoed(proposalId, reason); 
    } 
 
    // --- Governor overrides --- 
 
    function state(uint256 proposalId) 
        public view 
        override(Governor, GovernorTimelockControl) 
        returns (ProposalState) 
    { 
        if (_vetoed[proposalId]) return ProposalState.Canceled; 
        return super.state(proposalId); 
    } 
 
    function quorum(uint256 blockNumber) 
        public view override(Governor, GovernorVotesQuorumFraction) 
returns (uint256) 
    { return super.quorum(blockNumber); } 
 
    function getVotes(address account, uint256 blockNumber) 
        public view override(Governor, GovernorVotes) returns 
(uint256) 
    { return super.getVotes(account, blockNumber); } 
 
    function propose( 
        address[] memory targets, uint256[] memory values, bytes[] 
memory calldatas, string memory description 
    ) public override(Governor) returns (uint256) 
    { return super.propose(targets, values, calldatas, description); } 
 
    function _execute(uint256 proposalId, address[] memory targets, 
uint256[] memory values, bytes[] memory calldatas, bytes32 
descriptionHash) 
        internal override(Governor, GovernorTimelockControl) 
    { super._execute(proposalId, targets, values, calldatas, 
descriptionHash); } 
 
    function _cancel(address[] memory targets, uint256[] memory 
values, bytes[] memory calldatas, bytes32 descriptionHash) 
        internal override(Governor, GovernorTimelockControl) 
        returns (uint256) 
    { return super._cancel(targets, values, calldatas, 
descriptionHash); } 
 
    function supportsInterface(bytes4 interfaceId) 
        public view override(Governor, GovernorTimelockControl) 
        returns (bool) 
    { return super.supportsInterface(interfaceId); } 
} 
 
 
Servicio Governance (Node/TypeScript + Hardhat + Express) 
