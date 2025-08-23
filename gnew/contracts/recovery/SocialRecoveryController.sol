// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
import {ECDSA} from 
"openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol"; 
import {EIP712} from 
"openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol"; 
import {ReentrancyGuard} from 
"openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol"; 
import {GuardianManager} from "./GuardianManager.sol"; 
import {IRecoverable} from "./IRecoverable.sol"; 
/** 
* SocialRecoveryController 
* - Soporta dos flujos: on-chain approvals y off-chain EIP-712 firmas 
(batch). 
* - Timelock + expiración + cancelación por dueño o mayoría de 
guardianes. 
* - Diseñado para controlar una cuenta IRecoverable (ej. GnewAccount 
/ Safe-like wrapper). 
*/ 
contract SocialRecoveryController is EIP712, ReentrancyGuard { 
using ECDSA for bytes32; 
GuardianManager public immutable gm; 
IRecoverable public immutable account; 
uint64 public timelock = 2 days; 
uint64 public expiry = 7 days; 
 
    struct Recovery { 
        address proposed; 
        uint64 startedAt;   // cuando alcanza threshold 
        uint64 eta;         // startedAt + timelock 
        uint64 deadline;    // startedAt + expiry 
        uint32 approvals;   // contador (on-chain) 
        bool   executed; 
        mapping(address => bool) approved; // guardian => yes 
    } 
 
    uint256 public recoveryNonce; 
    mapping(uint256 => Recovery) private _recoveries; 
 
    event RecoveryProposed(uint256 indexed nonce, address indexed 
proposed, string evidenceURI); 
    event RecoveryApproved(uint256 indexed nonce, address indexed 
guardian, uint32 count); 
    event RecoveryReady(uint256 indexed nonce, uint64 eta); 
    event RecoveryCancelled(uint256 indexed nonce, string reason); 
    event RecoveryExecuted(uint256 indexed nonce, address newOwner); 
 
    // EIP-712: "ApproveRecovery(uint256 nonce,address 
proposed,address guardian)" 
    bytes32 public constant TYPEHASH = 
keccak256("ApproveRecovery(uint256 nonce,address proposed,address 
guardian)"); 
 
    constructor(GuardianManager _gm, IRecoverable _account) 
        EIP712("GNEW Social Recovery","1") 
    { gm=_gm; account=_account; } 
 
    // --- Parámetros --- 
    function setWindows(uint64 _timelock, uint64 _expiry) external { 
        require(msg.sender == address(account), "only account 
owner/admin"); 
        timelock = _timelock; expiry = _expiry; 
    } 
 
    // --- Flujo A: approvals on-chain (uno por guardian) --- 
 
    function proposeOnchain(address newOwner, string calldata 
evidenceURI) external nonReentrant returns (uint256 nonce) { 
        require(newOwner!=address(0), "zero"); 
        nonce = ++recoveryNonce; 
        Recovery storage r = _recoveries[nonce]; 
        r.proposed = newOwner; 
        emit RecoveryProposed(nonce, newOwner, evidenceURI); 
    } 
 
    function approveOnchain(uint256 nonce) external nonReentrant { 
        require(gm.isGuardian(msg.sender), "not guardian"); 
        Recovery storage r = _recoveries[nonce]; 
        require(r.proposed!=address(0), "no proposal"); 
        require(!r.executed, "done"); 
        require(!r.approved[msg.sender], "dup"); 
        r.approved[msg.sender]=true; 
        r.approvals += 1; 
        emit RecoveryApproved(nonce, msg.sender, r.approvals); 
 
        if (r.startedAt==0 && r.approvals >= gm.threshold()) { 
            r.startedAt = uint64(block.timestamp); 
            r.eta = r.startedAt + timelock; 
            r.deadline = r.startedAt + expiry; 
            emit RecoveryReady(nonce, r.eta); 
        } 
    } 
 
    // --- Flujo B: batch off-chain EIP-712 (firmas de guardians) --- 
 
    function proposeWithSignatures(address newOwner, address[] 
calldata signers, bytes[] calldata sigs, string calldata evidenceURI) 
external nonReentrant returns (uint256 nonce) { 
        require(signers.length == sigs.length, "len"); 
        require(newOwner!=address(0), "zero"); 
        // verifica firmantes únicos y guardians válidos 
        address prev = address(0); 
        for (uint i=0;i<signers.length;i++) { 
            require(gm.isGuardian(signers[i]), "not guardian"); 
            bytes32 digest = 
_hashTypedDataV4(keccak256(abi.encode(TYPEHASH, recoveryNonce+1, 
newOwner, signers[i]))); 
            address rec = ECDSA.recover(digest, sigs[i]); 
            require(rec == signers[i], "bad sig"); 
            require(signers[i] > prev, "unsorted/dup"); 
            prev = signers[i]; 
        } 
        require(signers.length >= gm.threshold(), "below N"); 
 
        nonce = ++recoveryNonce; 
        Recovery storage r = _recoveries[nonce]; 
        r.proposed = newOwner; 
        r.startedAt = uint64(block.timestamp); 
        r.eta = r.startedAt + timelock; 
        r.deadline = r.startedAt + expiry; 
        for (uint i=0;i<signers.length;i++) { 
            r.approved[signers[i]] = true; 
        } 
        r.approvals = uint32(signers.length); 
        emit RecoveryProposed(nonce, newOwner, evidenceURI); 
        emit RecoveryReady(nonce, r.eta); 
    } 
 
    // --- Finalización / Cancelación --- 
 
    function finalize(uint256 nonce) external nonReentrant { 
        Recovery storage r = _recoveries[nonce]; 
        require(r.proposed!=address(0), "no proposal"); 
        require(!r.executed, "done"); 
        require(r.startedAt!=0 && block.timestamp >= r.eta, 
"timelock"); 
        require(block.timestamp <= r.deadline, "expired"); 
        r.executed = true; 
        account.setOwner(r.proposed); 
        emit RecoveryExecuted(nonce, r.proposed); 
    } 
 
    /// @notice Cancelación por dueño actual de la cuenta o por 
mayoría de guardianes (N‑of‑M). 
    function cancel(uint256 nonce, address[] calldata signers, bytes[] 
calldata sigs, string calldata reason) external nonReentrant { 
        Recovery storage r = _recoveries[nonce]; 
        require(r.proposed!=address(0) && !r.executed, "bad"); 
        // 1) el propietario actual puede cancelar directamente 
        if (msg.sender == account.owner()) { 
            r.deadline = uint64(block.timestamp); // invalida 
            emit RecoveryCancelled(nonce, reason); 
            return; 
        } 
        // 2) o N‑of‑M guardians con EIP‑712 
        require(signers.length == sigs.length && signers.length >= 
gm.threshold(), "sig len/threshold"); 
        // tipo: ApproveRecovery(nonce, proposed, guardian) pero 
aplicado como "cancel intent" 
        address prev = address(0); 
        for (uint i=0;i<signers.length;i++) { 
            require(gm.isGuardian(signers[i]), "not guardian"); 
            bytes32 digest = 
_hashTypedDataV4(keccak256(abi.encode(TYPEHASH, nonce, r.proposed, 
signers[i]))); 
            address rec = ECDSA.recover(digest, sigs[i]); 
            require(rec == signers[i], "bad sig"); 
            require(signers[i] > prev, "unsorted/dup"); 
            prev = signers[i]; 
        } 
        r.deadline = uint64(block.timestamp); 
        emit RecoveryCancelled(nonce, reason); 
    } 
 
    // --- Vistas --- 
    function getRecovery(uint256 nonce) external view returns ( 
address proposed, uint64 startedAt, uint64 eta, uint64 
deadline, uint32 approvals, bool executed 
) { 
Recovery storage r = _recoveries[nonce]; 
return (r.proposed, r.startedAt, r.eta, r.deadline, 
r.approvals, r.executed); 
} 
} 
Notas de seguridad 
● proposeWithSignatures exige signers ordenados para evitar dups. 
● Cambios de guardian/threshold tienen churnDelay. 
● finalize respeta timelock y expiry. 
● cancel por dueño o N‑of‑M. 
● Para guardians smart usa EIP‑1271 en el servicio (ver abajo) o extiende el 
contrato con verificación isValidSignature. 
