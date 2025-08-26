// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
/** 
* @title GnewGovernorTimelocked 
* @author GNEW 
* @notice Governor híbrido (token+reputación) con ejecución a través de TimelockController.
* Flujo: propose → vote → queue (Timelock) → execute tras el delay.
*/ 
import {TimelockController} from 
"@openzeppelin/contracts/governance/TimelockController.sol"; 
import {Governor} from "@openzeppelin/contracts/governance/Governor.sol"; 
import {GovernorTimelockControl} from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol"; 
import {IVotes} from 
"@openzeppelin/contracts/governance/utils/IVotes.sol"; 
import {GnewGovernor} from "./GnewGovernor.sol"; 
contract GnewGovernorTimelocked is GnewGovernor, 
GovernorTimelockControl { 
    constructor( 
        IVotes tokenVotes, 
        IVotes repVotes, 
        uint16 tokenWeightBps, 
        uint16 repWeightBps, 
        uint16 quorumBps, 
        uint256 votingDelayBlocks, 
        uint256 votingPeriodBlocks, 
        uint256 proposalThresholdVotes, 
        TimelockController timelock 
    ) 
        GnewGovernor( 
            tokenVotes, 
            repVotes, 
            tokenWeightBps, 
            repWeightBps, 
            quorumBps, 
            votingDelayBlocks, 
            votingPeriodBlocks, 
            proposalThresholdVotes 
        ) 
        GovernorTimelockControl(timelock) 
    {} 
 
    // ---- Requeridos por herencia múltiple ---- 
    function state(uint256 proposalId) 
        public 
        view 
        override(Governor, GovernorTimelockControl) 
        returns (ProposalState) 
    { 
        return super.state(proposalId); 
    } 
 
    function propose( 
        address[] memory targets, uint256[] memory values, bytes[] 
memory calldatas, string memory description 
    ) 
        public 
        override(Governor) 
        returns (uint256) 
    { 
        return super.propose(targets, values, calldatas, description); 
    } 
 
    function _execute(uint256 proposalId, address[] memory targets, 
uint256[] memory values, bytes[] memory calldatas, bytes32 
descriptionHash) 
        internal 
        override(Governor, GovernorTimelockControl) 
    { 
        super._execute(proposalId, targets, values, calldatas, 
descriptionHash); 
    } 
 
    function _cancel(address[] memory targets, uint256[] memory 
values, bytes[] memory calldatas, bytes32 descriptionHash) 
        internal 
        override(Governor, GovernorTimelockControl) 
        returns (uint256) 
    { 
        return super._cancel(targets, values, calldatas, 
descriptionHash); 
    } 
 
    function _executor() 
        internal 
        view 
        override(Governor, GovernorTimelockControl) 
        returns (address) 
    { 
        return super._executor(); 
    } 
 
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(GnewGovernor, GovernorTimelockControl) 
        returns (bool) 
    { 
        return super.supportsInterface(interfaceId); 
    } 
} 
 
