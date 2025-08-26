// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
/** 
* @title ReputationScore (soulbound, compatible con IVotes) 
* @author GNEW 
* @notice Módulo de reputación no transferible con checkpoints y 
delegación (OZ Votes). 
*         
Sirve como segunda fuente de poder de voto para el 
GnewGovernor. 
* 
* Características: 
*  - No es ERC20. Mantiene un "score" entero por cuenta. 
*  - Delegación y snapshots vía OpenZeppelin Votes. 
*  - Roles: DEFAULT_ADMIN_ROLE (gestión), SCORER_ROLE (asignar 
puntuaciones). 
* 
 * Funciones: 
 *  - setScore / setScores: fija la puntuación de una cuenta 
(soulbound). 
 *  - mintScore / burnScore: helpers incrementales. 
 *  - getVotes / getPastVotes: expone poder de voto por bloque. 
 */ 
import {AccessControl} from 
"@openzeppelin/contracts/access/AccessControl.sol"; 
import {EIP712} from 
"@openzeppelin/contracts/utils/cryptography/EIP712.sol"; 
import {Votes} from 
"@openzeppelin/contracts/governance/utils/Votes.sol"; 
 
contract ReputationScore is AccessControl, EIP712, Votes { 
    bytes32 public constant SCORER_ROLE = keccak256("SCORER_ROLE"); 
 
    // almacenamiento del "score" actual por cuenta y total agregado 
    mapping(address => uint256) private _score; 
    uint256 private _totalScore; 
 
    event ScoreSet(address indexed account, uint256 previous, uint256 
current); 
    event ScoreIncreased(address indexed account, uint256 by, uint256 
newScore); 
    event ScoreDecreased(address indexed account, uint256 by, uint256 
newScore); 
 
    constructor(address admin, address scorer) 
        EIP712("GNEW-Reputation", "1") 
        Votes() 
    { 
        require(admin != address(0) && scorer != address(0), 
"admin/scorer=0"); 
        _grantRole(DEFAULT_ADMIN_ROLE, admin); 
        _grantRole(SCORER_ROLE, scorer); 
    } 
 
    // ---------- Gestión de score (soulbound) ---------- 
 
    function setScore(address account, uint256 newScore) external 
onlyRole(SCORER_ROLE) { 
        uint256 prev = _score[account]; 
        if (newScore == prev) return; 
 
        if (newScore > prev) { 
            uint256 delta = newScore - prev; 
            _transferVotingUnits(address(0), account, delta); 
            _totalScore += delta; 
        } else { 
            uint256 delta = prev - newScore; 
            _transferVotingUnits(account, address(0), delta); 
            _totalScore -= delta; 
        } 
        _score[account] = newScore; 
        emit ScoreSet(account, prev, newScore); 
    } 
 
    function setScores(address[] calldata accounts, uint256[] calldata 
scores) external onlyRole(SCORER_ROLE) { 
        require(accounts.length == scores.length, "len mismatch"); 
        for (uint256 i = 0; i < accounts.length; i++) { 
            this.setScore(accounts[i], scores[i]); 
        } 
    } 
 
    function mintScore(address to, uint256 by) external 
onlyRole(SCORER_ROLE) { 
        if (by == 0) return; 
        _score[to] += by; 
        _totalScore += by; 
    _transferVotingUnits(address(0), to, by); 
        emit ScoreIncreased(to, by, _score[to]); 
    } 
 
    function burnScore(address from, uint256 by) external 
onlyRole(SCORER_ROLE) { 
        if (by == 0) return; 
        uint256 prev = _score[from]; 
        uint256 dec = by > prev ? prev : by; 
        _score[from] = prev - dec; 
        _totalScore -= dec; 
    _transferVotingUnits(from, address(0), dec); 
        emit ScoreDecreased(from, dec, _score[from]); 
    } 
 
    // ---------- Hooks de Votes ---------- 
 
    function _getVotingUnits(address account) internal view override 
returns (uint256) { 
        return _score[account]; 
    } 
 
    function _transferVotingUnits(address from, address to, uint256 amount) internal override { 
        // Propaga cambios a Votes (checkpoints y delegaciones)
        super._transferVotingUnits(from, to, amount); 
    } 
 
    // ---------- Vistas ---------- 
 
    function currentScore(address account) external view returns 
(uint256) { 
        return _score[account]; 
    } 
 
    function totalScore() external view returns (uint256) { 
        return _totalScore; 
    } 
} 
 
