// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
/** 
* @title GnewGovernor — Gobernanza híbrida (token + reputación) con 
ponderación configurable 
* @author GNEW 
* 
* Mezcla *token voting* (IVotes) y *reputation voting* (IVotes) con 
pesos en BPS. 
* Por defecto 70% token / 30% reputación; actualizable vía 
gobernanza. 
* 
* Componentes OZ: 
*  - Governor (núcleo) 
*  - GovernorSettings (votingDelay, votingPeriod, proposalThreshold) 
*  - GovernorCountingSimple (For/Against/Abstain) 
* 
* NOTA IMPORTANTE: `tokenVotes` y `repVotes` deben ser **IVotes** 
(con checkpoints). 
*   - El módulo de reputación recomendado es `ReputationScore`. 
*   - Para token, usa un ERC20Votes (o wrapper con IVotes). 
*/ 
import {Governor} from 
"@openzeppelin/contracts/governance/Governor.sol"; 
import {GovernorSettings} from 
"@openzeppelin/contracts/governance/extensions/GovernorSettings.sol"; 
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol"; 
import {IVotes} from 
"@openzeppelin/contracts/governance/utils/IVotes.sol"; 
contract GnewGovernor is Governor, GovernorSettings, 
GovernorCountingSimple { 
// fuentes de poder 
IVotes public immutable tokenVotes; 
IVotes public immutable repVotes; 
    // pesos en basis points (1e4 = 100%) 
    uint16 public tokenWeightBps; // p.ej., 7000 
    uint16 public repWeightBps;   // p.ej., 3000 
 
    // quorum como fracción BPS de la **suma ponderada** de supplies 
    uint16 public quorumBps;      // p.ej., 400 = 4% 
 
    event WeightsUpdated(uint16 tokenBps, uint16 repBps); 
    event QuorumUpdated(uint16 quorumBps); 
 
    constructor( 
        IVotes _tokenVotes, 
        IVotes _repVotes, 
        uint16 _tokenWeightBps, 
        uint16 _repWeightBps, 
        uint16 _quorumBps, 
        uint256 votingDelayBlocks, 
        uint256 votingPeriodBlocks, 
        uint256 proposalThresholdVotes 
    ) 
        Governor("GNEW-Governor") 
        GovernorSettings(votingDelayBlocks, votingPeriodBlocks, 
proposalThresholdVotes) 
    { 
        require(address(_tokenVotes) != address(0) && 
address(_repVotes) != address(0), "sources=0"); 
        require(_tokenWeightBps + _repWeightBps == 10_000, 
"weights!=100%"); 
        tokenVotes = _tokenVotes; 
        repVotes = _repVotes; 
        tokenWeightBps = _tokenWeightBps; 
        repWeightBps = _repWeightBps; 
        quorumBps = _quorumBps; 
        emit WeightsUpdated(_tokenWeightBps, _repWeightBps); 
        emit QuorumUpdated(_quorumBps); 
    } 
 
    // --------- Config gobernada --------- 
 
    /// @notice Actualiza pesos (sólo vía gobernanza). 
    function setWeights(uint16 tokenBps, uint16 repBps) external 
onlyGovernance { 
        require(tokenBps + repBps == 10_000, "weights!=100%"); 
        tokenWeightBps = tokenBps; 
        repWeightBps = repBps; 
        emit WeightsUpdated(tokenBps, repBps); 
    } 
 
    /// @notice Actualiza quorum (BPS sobre supply ponderado). 
    function setQuorumBps(uint16 newQuorumBps) external onlyGovernance 
{ 
        require(newQuorumBps <= 10_000, "quorum>100%"); 
        quorumBps = newQuorumBps; 
        emit QuorumUpdated(newQuorumBps); 
    } 
 
    // --------- Núcleo de mezcla --------- 
 
    /// @dev Poder de voto por cuenta en `blockNumber` = mix ponderado de ambas fuentes. 
    function _getVotes(address account, uint256 blockNumber, bytes 
memory /*params*/ ) 
        internal 
        view 
        override 
        returns (uint256) 
    { 
        uint256 tv = tokenVotes.getPastVotes(account, blockNumber); 
        uint256 rv = repVotes.getPastVotes(account, blockNumber); 
        // (tv * tokenBps + rv * repBps) / 10000 
        unchecked { 
            return (tv * tokenWeightBps + rv * repWeightBps) / 10_000; 
        } 
    } 
 
    /// @notice Quorum = fracción del supply ponderado de ambas fuentes en el bloque. 
    function quorum(uint256 blockNumber) public view override returns 
(uint256) { 
        uint256 ts = tokenVotes.getPastTotalSupply(blockNumber); 
        uint256 rs = repVotes.getPastTotalSupply(blockNumber); 
        uint256 mixedSupply = (ts * tokenWeightBps + rs * 
repWeightBps) / 10_000; 
        return (mixedSupply * quorumBps) / 10_000; 
    } 
 
    // --------- Overrides de múltiples herencias --------- 
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(Governor) 
        returns (bool) 
    { 
        return super.supportsInterface(interfaceId); 
    } 
} 
 
