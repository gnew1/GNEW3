// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
/** 
* @title QuadraticCounter 
* @author GNEW 
* @notice Módulo de conteo cuadrático para OpenZeppelin Governor. 
* 
* Modos de operación: 
*  1) **On-chain**: cada voto se pondera como `sqrt(weight)` (weight 
= poder de voto reportado por Governor::_getVotes). 
*  2) **Off-chain tally con verificación on-chain**: 
*      - Un "tallier" agrega off-chain los votos cuadráticos y 
publica en cadena: 
*          
*      
(forQ, againstQ, abstainQ, merkleRoot) por propuesta. - El contrato almacena ese resultado y bloquea más conteo 
on-chain. 
*      - Cualquiera puede verificar hojas del cómputo vía 
`verifyOffchainLeaf(...)`. 
 * 
 * Propiedades: 
 *  - Sin colisiones: hojas merkle usan `abi.encode` + domain 
separation (chainId, address(this)). 
 *  - Redondeos: usa `Math.sqrt` (floor). Se testean bordes (cuadrados 
perfectos y vecinos). 
 *  - Gas: estructuras compactas y una sola suma por voto. 
 * 
 * Integración: 
 *  - Hereda directamente de `Governor`. Sustituye a 
`GovernorCountingSimple`. 
 *  - Requiere que el Governor concreto implemente `_getVotes` (p.ej., 
`GovernorVotes` o mixto). 
 */ 
 
import {Governor} from 
"@openzeppelin/contracts/governance/Governor.sol"; 
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol"; 
import {MerkleProof} from 
"@openzeppelin/contracts/utils/cryptography/MerkleProof.sol"; 
 
abstract contract QuadraticCounter is Governor { 
    // ---- Votos on-chain acumulados por propuesta (si no se finalizó 
off-chain) ---- 
    struct ProposalVotesQ { 
        uint256 againstVotes; 
        uint256 forVotes; 
        uint256 abstainVotes; 
    } 
    mapping(uint256 proposalId => ProposalVotesQ) private 
_proposalVotesQ; 
 
    // ---- Resultado off-chain publicado/“sellado” por propuesta ---- 
    struct OffchainTally { 
        bool    finalized;             // true => se usan los valores 
off-chain 
        uint256 againstVotes;          // suma cuadrática off-chain 
        uint256 forVotes;              // suma cuadrática off-chain 
        uint256 abstainVotes;          // suma cuadrática off-chain 
        bytes32 merkleRoot;            // raíz de hojas (opcional, 
para verificación) 
    } 
    mapping(uint256 proposalId => OffchainTally) public offchain; 
 
    /// @notice Operador autorizado a publicar resultados off-chain 
(agregador). 
    address public tallier; 
 
    event VoteCountedQ(uint256 indexed proposalId, address indexed 
voter, uint8 support, uint256 rawWeight, uint256 qWeight); 
    event OffchainFinalized(uint256 indexed proposalId, uint256 
againstQ, uint256 forQ, uint256 abstainQ, bytes32 merkleRoot); 
    event TallierUpdated(address indexed newTallier); 
 
    error OffchainFinalizedAlready(); 
    error TallierOnly(); 
 
    constructor(address initialTallier) { 
        tallier = initialTallier; 
        emit TallierUpdated(initialTallier); 
    } 
 
    /// @notice Modo de conteo (para tooling). 
    function COUNTING_MODE() public pure virtual returns (string 
memory) { 
        // Bravo-style (Against/For/Abstain) con conteo "quadratic" 
        return 
"support=bravo&quorum=for,abstain,against&counting=quadratic"; 
    } 
 
    /// @notice Actualiza el tallier (sólo gobernanza). 
    function setTallier(address newTallier) external onlyGovernance { 
        tallier = newTallier; 
        emit TallierUpdated(newTallier); 
    } 
 
    // ------------------------------------------------------------------------ 
    //                         Núcleo de conteo 
    // ------------------------------------------------------------------------ 
 
    /// @dev Suma `sqrt(weight)` a la canasta elegida. Bloquea si hay 
tally off-chain finalizado. 
    function _countVote( 
        uint256 proposalId, 
        address account, 
        uint8 support, 
        uint256 weight, 
        bytes memory /*params*/ 
    ) internal virtual override { 
        OffchainTally storage oc = offchain[proposalId]; 
        if (oc.finalized) revert OffchainFinalizedAlready(); 
 
        // Transformación cuadrática (floor sqrt) 
        uint256 q = Math.sqrt(weight); 
 
        ProposalVotesQ storage pv = _proposalVotesQ[proposalId]; 
        if (support == uint8(VoteType.Against)) { 
            pv.againstVotes += q; 
        } else if (support == uint8(VoteType.For)) { 
            pv.forVotes += q; 
        } else if (support == uint8(VoteType.Abstain)) { 
            pv.abstainVotes += q; 
        } else { 
            revert InvalidVoteType(); 
        } 
        emit VoteCountedQ(proposalId, account, support, weight, q); 
    } 
 
    /// @notice Publica el resultado off-chain para la propuesta (sólo 
`tallier`). 
    /// @dev Tras finalizar, ya no se aceptan votos on-chain para esa 
propuesta. 
    function finalizeOffchainTally( 
        uint256 proposalId, 
        uint256 againstQ, 
        uint256 forQ, 
        uint256 abstainQ, 
        bytes32 merkleRoot 
    ) external { 
        if (msg.sender != tallier) revert TallierOnly(); 
        OffchainTally storage oc = offchain[proposalId]; 
        if (oc.finalized) revert OffchainFinalizedAlready(); 
 
        oc.finalized    = true; 
        oc.againstVotes = againstQ; 
        oc.forVotes     = forQ; 
        oc.abstainVotes = abstainQ; 
        oc.merkleRoot   = merkleRoot; 
 
        emit OffchainFinalized(proposalId, againstQ, forQ, abstainQ, 
merkleRoot); 
    } 
 
    /// @notice Devuelve los votos (Q) de la propuesta, priorizando 
resultado off-chain si existe. 
    function proposalVotes(uint256 proposalId) 
        public 
        view 
        virtual 
        returns (uint256 againstVotes, uint256 forVotes, uint256 
abstainVotes) 
    { 
        OffchainTally memory oc = offchain[proposalId]; 
        if (oc.finalized) { 
            return (oc.againstVotes, oc.forVotes, oc.abstainVotes); 
        } 
        ProposalVotesQ memory pv = _proposalVotesQ[proposalId]; 
        return (pv.againstVotes, pv.forVotes, pv.abstainVotes); 
    } 
 
    // --------- Semántica de éxito/quórum (Bravo) con conteo 
cuadrático --------- 
 
    function _quorumReached(uint256 proposalId) internal view virtual 
override returns (bool) { 
        (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes) 
= proposalVotes(proposalId); 
        return quorum(proposalSnapshot(proposalId)) <= (forVotes + 
abstainVotes + againstVotes); 
    } 
 
    function _voteSucceeded(uint256 proposalId) internal view virtual 
override returns (bool) { 
        (uint256 againstVotes, uint256 forVotes, ) = 
proposalVotes(proposalId); 
        return forVotes > againstVotes; 
    } 
 
    // ------------------------------------------------------------------------ 
    //                 Verificación on-chain de tally off-chain 
    // ------------------------------------------------------------------------ 
 
    /** 
     * @notice Verifica que una hoja (voto individual) pertenece al 
Merkle root de una propuesta. 
     * @dev Hoja = keccak256(abi.encode( 
     *          chainId, address(this), proposalId, 
     *          voter, support (0/1/2), rawWeight, qWeight)) 
     *      Usa `abi.encode` (no `encodePacked`) para evitar 
colisiones. 
     */ 
    function verifyOffchainLeaf( 
        uint256 proposalId, 
        address voter, 
        uint8 support, 
        uint256 rawWeight, 
        uint256 qWeight, 
        bytes32[] calldata merkleProof 
    ) public view returns (bool) { 
        bytes32 root = offchain[proposalId].merkleRoot; 
        if (root == bytes32(0)) return false; 
        bytes32 leaf = keccak256( 
            abi.encode(block.chainid, address(this), proposalId, 
voter, support, rawWeight, qWeight) 
        ); 
        return MerkleProof.verify(merkleProof, root, leaf); 
    } 
 
    // --------- Errores de Governor (coherente con OZ) --------- 
    error InvalidVoteType(); 
} 
 
