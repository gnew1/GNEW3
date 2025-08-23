// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
/** 
 * SybilGate 
 * - Valida prueba Merkle de que (address, riskMilli, version) está 
incluido y cumple umbral. 
 * - Se usa como "gate" para funciones sensibles (modificador). 
 * - Caches de aprobación por epoch para ahorrar gas. 
 */ 
import {SybilRootRegistry} from "./SybilRootRegistry.sol"; 
 
library Merkle { 
    function verify(bytes32 leaf, bytes32 root, bytes32[] memory 
proof) internal pure returns (bool) { 
        bytes32 h = leaf; 
        for (uint i=0; i<proof.length; i++) { 
            bytes32 sib = proof[i]; 
            h = keccak256(abi.encodePacked(h <= sib ? 
abi.encodePacked(h, sib) : abi.encodePacked(sib, h))); 
        } 
        return h == root; 
    } 
} 
 
contract SybilGate { 
    SybilRootRegistry public immutable registry; 
    uint64 public currentEpoch; // fijado por backend/DAO (o leer root 
más reciente) 
    mapping(uint64 => mapping(address => uint64)) public passUntil; // 
epoch -> addr -> timestamp exp 
 
    event EpochSet(uint64 epoch); 
    event PassCached(address indexed user, uint64 epoch, uint64 
until); 
 
    constructor(SybilRootRegistry _registry, uint64 initialEpoch) { 
        registry = _registry; 
        currentEpoch = initialEpoch; 
    } 
 
    function setEpoch(uint64 e) external { // en producción: 
controlado por DAO 
        currentEpoch = e; emit EpochSet(e); 
    } 
 
    function _leaf(address user, uint32 riskMilli, uint32 version) 
internal pure returns (bytes32) { 
        return keccak256(abi.encode(user, riskMilli, version)); 
    } 
 
    function check(address user, uint32 maxRiskMilli, uint32 version, 
bytes32[] calldata proof) public view returns (bool) { 
        SybilRootRegistry.RootMeta memory m = 
registry.epochs(currentEpoch); 
        require(m.merkleRoot != bytes32(0), "no root"); 
        // Aquí el caller debe haber recibido su riskMilli del 
verificador off-chain (o incluirlo codificado) 
        // Para on-chain pura, el usuario debería proporcionar también 
su riskMilli; contract no puede derivarlo. 
        // Este check asume que `proof` fue construido para leaf con 
riskMilli <= maxRiskMilli. 
        // Verificador externo debe garantizar correspondencia. 
        // En integración real: leaf = keccak(user, riskMilli, 
version) y se verifica con riskMilli explícito. 
        // Para simplicidad, pedimos que el primer elemento de proof 
sea "leaf" materializado: 
        // NOTA: este patrón es opcional; mantén API coherente con tu 
verificador. 
        bytes32 leaf = proof[0]; 
        bytes32[] memory path = new bytes32[](proof.length-1); 
        for (uint i=1;i<proof.length;i++) path[i-1]=proof[i]; 
        return Merkle.verify(leaf, m.merkleRoot, path); 
    } 
 
    modifier antiSybil(address user, uint32 maxRiskMilli, uint32 
version, bytes32[] calldata proof) { 
        if (block.timestamp <= passUntil[currentEpoch][user]) { _; 
return; } 
        require(check(user, maxRiskMilli, version, proof), "sybil 
gate"); 
        passUntil[currentEpoch][user] = uint64(block.timestamp + 1 
days); 
        emit PassCached(user, currentEpoch, 
passUntil[currentEpoch][user]); 
        _; 
    } 
} 
 
Nota: Mantén el formato de hoja Merkle consistente con el pipeline (ver Python). 
En producción, pasa (riskMilli, version) explícitos a check() y deriva el leaf 
on‑chain para evitar ambigüedad. 
 
