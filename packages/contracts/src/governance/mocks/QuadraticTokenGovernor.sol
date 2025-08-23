// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
import {IVotes} from 
"@openzeppelin/contracts/governance/utils/IVotes.sol"; 
import {Governor} from 
"@openzeppelin/contracts/governance/Governor.sol"; 
import {GovernorSettings} from 
"@openzeppelin/contracts/governance/extensions/GovernorSettings.sol"; 
import {GovernorVotes} from 
"@openzeppelin/contracts/governance/extensions/GovernorVotes.sol"; 
import {QuadraticCounter} from "../extensions/QuadraticCounter.sol"; 
 
/** 
 * @title QuadraticTokenGovernor (mock de integración) 
 * @notice Governor que usa un único IVotes (token) y conteo 
cuadrático (sqrt). 
 */ 
contract QuadraticTokenGovernor is Governor, GovernorSettings, 
GovernorVotes, QuadraticCounter { 
    constructor( 
        IVotes token, 
        address tallier, 
        uint256 votingDelayBlocks, 
        uint256 votingPeriodBlocks, 
        uint256 proposalThresholdVotes 
    ) 
        Governor("QV-Governor") 
        GovernorSettings(votingDelayBlocks, votingPeriodBlocks, 
proposalThresholdVotes) 
        GovernorVotes(token) 
        QuadraticCounter(tallier) 
    {} 
 
    // Mantenemos el quorum lineal sobre el supply del token IVotes 
(puedes sobreescribir si quieres otro esquema). 
    function quorum(uint256 blockNumber) public view override returns 
(uint256) { 
        // 4% por defecto (ajusta fuera en tests con supply pequeño) 
        return (token.getPastTotalSupply(blockNumber) * 400) / 10_000; 
    } 
 
    // Resolución de múltiples herencias 
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(Governor) 
        returns (bool) 
    { 
        return super.supportsInterface(interfaceId); 
    } 
 
    function _getVotes(address account, uint256 blockNumber, bytes 
memory params) 
        internal 
        view 
        override(Governor, GovernorVotes) 
        returns (uint256) 
    { 
        return super._getVotes(account, blockNumber, params); 
    } 
} 
 
