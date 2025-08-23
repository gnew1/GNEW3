// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
// Nota: Ajusta imports a la versión de EntryPoint/IPaymaster usada en 
el repositorio. 
import {IEntryPoint} from 
"account-abstraction/interfaces/IEntryPoint.sol"; 
import {Ownable2Step} from 
"openzeppelin-contracts/contracts/access/Ownable2Step.sol"; 
import {ECDSA} from 
"openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol"; 
 
/** 
 * GnewRulesPaymaster 
 * - Verifica un "SponsorshipTicket" firmado por el servicio Sponsor 
(clave rotativa) 
 * - Aplica allowlist de contratos/métodos y límites de importe/gas 
 * - Usa depósito en EntryPoint para pagar el gas 
 * 
 * ATENCIÓN: Revisa la firma exacta de validatePaymasterUserOp según 
versión de ERC-4337 en el repo. 
 */ 
contract GnewRulesPaymaster is Ownable2Step { 
    using ECDSA for bytes32; 
 
    struct Rule { 
        bool allowed; 
        uint256 maxValueWei;      // límite por transacción (si 
aplica) 
        uint256 maxGasLimit;      // gas cap 
    } 
 
    struct Ticket { 
        address user;             // AA del usuario 
        address to;               // contrato destino 
        bytes4 selector;          // método 
        uint256 maxValueWei; 
        uint256 maxGasLimit; 
        uint256 nonce;            // anti-replay por política 
        uint48  validUntil;       // timestamp vencimiento (UTC) 
        uint48  validAfter;       // obligación de no usar antes de... 
        uint256 policyId;         // versión/política 
        uint256 chainId;          // defensa L1/L2 mismatch 
    } 
 
    IEntryPoint public immutable entryPoint; 
    address public sponsorSigner; // clave ECDSA del servicio Sponsor 
    mapping(address => mapping(bytes4 => Rule)) public rules; // 
allowlist 
    mapping(bytes32 => bool) public usedTickets; // anti-replay (hash 
del ticket) 
 
    event SponsorSignerUpdated(address signer); 
    event RuleUpdated(address to, bytes4 selector, Rule rule); 
 
    modifier onlyEntryPoint() { 
        require(msg.sender == address(entryPoint), "only EntryPoint"); 
        _; 
    } 
 
    constructor(IEntryPoint _entryPoint, address _sponsorSigner) { 
        entryPoint = _entryPoint; 
        sponsorSigner = _sponsorSigner; 
    } 
 
    function setSponsorSigner(address signer) external onlyOwner { 
        sponsorSigner = signer; 
        emit SponsorSignerUpdated(signer); 
    } 
 
    function setRule(address to, bytes4 selector, Rule calldata rule_) 
external onlyOwner { 
        rules[to][selector] = rule_; 
        emit RuleUpdated(to, selector, rule_); 
    } 
 
    // ---- 4337 hook (ajustar firma exacta a la versión del repo) ---- 
    // Ej. v0.6: validatePaymasterUserOp(UserOperation calldata, 
bytes32, uint256) 
    function validatePaymasterUserOp( 
        /*UserOperation*/ bytes calldata userOp, // usar struct real 
en el repo 
        bytes32 userOpHash, 
        uint256 /*maxCost*/ 
    ) 
        external 
        onlyEntryPoint 
        returns (bytes memory context, uint256 validationData) 
    { 
        // Extraer paymasterAndData -> abi.decode(ticket, sig) 
        // Extraer callData -> destino y selector 
        // PSEUDOCÓDIGO: reemplazar con parsing real de UserOperation 
        (Ticket memory t, bytes memory sig) = 
_decodePaymasterAndData(userOp); 
 
        require(block.timestamp <= t.validUntil && block.timestamp >= 
t.validAfter, "expired/not yet valid"); 
        require(t.chainId == block.chainid, "wrong chain"); 
 
        // Anti-replay 
        bytes32 th = _ticketHash(t); 
        require(!usedTickets[th], "ticket used"); 
        usedTickets[th] = true; 
 
        // Verificar firma del Sponsor 
        address rec = th.toEthSignedMessageHash().recover(sig); 
        require(rec == sponsorSigner, "bad sponsor sig"); 
 
        // Enforce allowlist 
        Rule memory r = rules[t.to][t.selector]; 
        require(r.allowed, "method not allowed"); 
 
        // Enforce caps 
        require(t.maxValueWei <= r.maxValueWei, "value cap exceeded"); 
        require(t.maxGasLimit <= r.maxGasLimit, "gas cap exceeded"); 
 
        // Opcional: validar que userOp.calldata.to == t.to y selector 
coincide 
        // Opcional: validar sender == t.user (AA address) 
 
        // validationData = 0 => válido hasta validUntil; codificar en 
formato ERC-4337 si aplica 
        validationData = 0; 
        context = abi.encode(t.user); 
    } 
 
    function _decodePaymasterAndData(bytes calldata /*userOp*/) 
        internal pure 
        returns (Ticket memory, bytes memory) 
    { 
        // Implementación real según layout paymasterAndData en el SDK 
del repo 
        revert("decode not implemented (wire to SDK)"); 
    } 
 
    function _ticketHash(Ticket memory t) internal pure returns 
(bytes32) { 
        return keccak256(abi.encode( 
            keccak256("GNEW_SPONSOR_TICKET"), 
            t.user, t.to, t.selector, t.maxValueWei, t.maxGasLimit, 
            t.nonce, t.validUntil, t.validAfter, t.policyId, t.chainId 
        )); 
    } 
 
    // Depósitos y retiro vía EntryPoint (owner) 
function addDeposit() external payable { 
entryPoint.depositTo{value: msg.value}(address(this)); 
} 
function withdrawTo(address payable target, uint256 amount) 
external onlyOwner { 
entryPoint.withdrawTo(target, amount); 
} 
} 
Notas: 
● La firma de validatePaymasterUserOp y parsing de UserOperation 
deben ajustarse exactamente a la versión de AA usada en el monorepo. 
● El paymasterAndData debe definirse en el SDK para empaquetar 
(Ticket, sig). 
5.2 Servicio Sponsor (TypeScript/Node) 
