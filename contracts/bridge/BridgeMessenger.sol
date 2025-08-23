// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
 
import "@openzeppelin/contracts/access/AccessControl.sol"; 
import "./IBridgeReceiver.sol"; 
import "./LightClientBasic.sol"; 
 
/// @title BridgeMessenger (PoC Optimistic) 
/// @notice Mensajería optimista con ventana de challenge y fianza. Un 
LightClient básico 
///         aporta el hash "verdadero" del evento origen para 
aceptar/frenar fraudes. 
contract BridgeMessenger is AccessControl { 
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE"); 
    bytes32 public constant ADMIN_ROLE   = keccak256("ADMIN_ROLE"); 
 
    uint256 public immutable selfChainId; 
 
    // chainId remoto => dirección BridgeMessenger remoto autorizada 
(informativo/base). 
    mapping(uint256 => address) public remoteMessenger; 
 
    // Parámetros de seguridad PoC 
    uint256 public challengePeriod = 60; // segundos 
    uint256 public bondAmount = 0.05 ether; 
 
    // Contador de mensajes salientes 
    uint256 public outboxNonce; 
 
    struct Message { 
        uint256 srcChainId; 
        uint256 dstChainId; 
        address srcSender;    // contrato que origina el mensaje 
(p.ej. Lockbox origen) 
        address dstReceiver;  // contrato receptor (p.ej. Lockbox 
destino) 
        uint256 nonce;        // nonce local para unicidad 
        bytes   data;         // payload ABI-encodificado 
    } 
 
    struct Pending { 
        address relayer; 
        uint256 bond; 
        uint64  timestamp; 
        bytes32 claimedHash; // hash reclamado por el relayer para 
(eventId,data) 
        bool    delivered; 
        Message msg; 
    } 
 
    mapping(bytes32 => Pending) public pending; // eventId => info 
 
    event RemoteSet(uint256 indexed chainId, address messenger); 
    event MessageSent( 
        bytes32 indexed eventId, 
        uint256 indexed srcChainId, 
        uint256 indexed dstChainId, 
        address srcSender, 
        address dstReceiver, 
        uint256 nonce, 
        bytes data, 
        bytes32 eventHash 
    ); 
    event MessageSubmitted(bytes32 indexed eventId, address indexed 
relayer, bytes32 claimedHash); 
    event MessageChallenged(bytes32 indexed eventId, address indexed 
challenger, address indexed slashedRelayer, uint256 bondPaid); 
    event MessageFinalized(bytes32 indexed eventId, address indexed 
relayer); 
 
    constructor(uint256 _selfChainId, address admin) { 
        selfChainId = _selfChainId; 
        _grantRole(DEFAULT_ADMIN_ROLE, admin); 
        _grantRole(ADMIN_ROLE, admin); 
    } 
 
    // ----------------- Admin ----------------- 
    function setRemote(uint256 chainId, address messenger) external 
onlyRole(ADMIN_ROLE) { 
        remoteMessenger[chainId] = messenger; 
        emit RemoteSet(chainId, messenger); 
    } 
 
    function setChallengePeriod(uint256 seconds_) external 
onlyRole(ADMIN_ROLE) { 
        require(seconds_ >= 10, "too short"); 
        challengePeriod = seconds_; 
    } 
 
    function setBondAmount(uint256 wei_) external onlyRole(ADMIN_ROLE) 
{ 
        bondAmount = wei_; 
    } 
 
    function grantRelayer(address who) external onlyRole(ADMIN_ROLE) { 
        _grantRole(RELAYER_ROLE, who); 
    } 
 
    // ----------------- Helpers ----------------- 
    function computeEventId(Message memory m) public pure returns 
(bytes32) { 
        // No incluye data para impedir que un relayer "cambie" 
eventId alterando data. 
        return keccak256(abi.encode(m.srcChainId, m.dstChainId, 
m.srcSender, m.dstReceiver, m.nonce)); 
    } 
 
    function computeMessageHash(Message memory m) public pure returns 
(bytes32) { 
        return keccak256(abi.encode(computeEventId(m), 
keccak256(m.data))); 
    } 
 
    // ----------------- Outbox (source chain) ----------------- 
    function sendMessage(address dstReceiver, uint256 dstChainId, 
bytes calldata data) external returns (bytes32 eventId) { 
        Message memory m = Message({ 
            srcChainId: block.chainid, 
            dstChainId: dstChainId, 
            srcSender: msg.sender, 
            dstReceiver: dstReceiver, 
            nonce: ++outboxNonce, 
            data: data 
        }); 
 
        eventId = computeEventId(m); 
        bytes32 eventHash = computeMessageHash(m); 
        emit MessageSent(eventId, m.srcChainId, m.dstChainId, 
m.srcSender, m.dstReceiver, m.nonce, m.data, eventHash); 
        // No almacenamiento adicional necesario para PoC. 
    } 
 
    // ----------------- Inbox (destination chain) ----------------- 
    function submitMessage(Message calldata m, bytes32 claimedHash) 
external payable onlyRole(RELAYER_ROLE) { 
        require(msg.value == bondAmount, "bad bond"); 
        require(m.dstChainId == selfChainId, "bad dst"); 
        bytes32 id = computeEventId(m); 
        Pending storage p = pending[id]; 
        require(p.timestamp == 0 && !p.delivered, "already pending"); 
        p.relayer = msg.sender; 
        p.bond = msg.value; 
        p.timestamp = uint64(block.timestamp); 
        p.claimedHash = claimedHash; 
        p.msg = m; 
        emit MessageSubmitted(id, msg.sender, claimedHash); 
    } 
 
    /// @notice Cualquiera puede desafiar si el LightClient desmiente 
el hash reclamado. 
    function challenge(bytes32 eventId, LightClientBasic lc, bytes32 
truthHash) external { 
        Pending storage p = pending[eventId]; 
        require(p.timestamp != 0 && !p.delivered, "no pending"); 
        bytes32 onchain = lc.getEventHash(p.msg.srcChainId, eventId); 
        require(onchain == truthHash, "truth mismatch"); 
        require(onchain != p.claimedHash, "not fraud"); 
        // Confiscamos la fianza al relayer y pagamos al retador 
        uint256 bond = p.bond; 
        address slashed = p.relayer; 
        delete pending[eventId]; 
        (bool ok,) = msg.sender.call{value: bond}(""); 
        require(ok, "bond transfer failed"); 
        emit MessageChallenged(eventId, msg.sender, slashed, bond); 
    } 
 
    /// @notice Finaliza si ha pasado la ventana de challenge y el 
LightClient confirma el hash. 
    function finalize(bytes32 eventId, LightClientBasic lc) external { 
        Pending storage p = pending[eventId]; 
        require(p.timestamp != 0 && !p.delivered, "no pending"); 
        require(block.timestamp >= uint256(p.timestamp) + 
challengePeriod, "challenge window"); 
        // Verificación con LightClient 
        bytes32 truth = lc.getEventHash(p.msg.srcChainId, eventId); 
        require(truth != bytes32(0), "no truth"); 
        require(truth == p.claimedHash, "hash mismatch"); 
        // Entrega 
        p.delivered = true; 
        
IBridgeReceiver(p.msg.dstReceiver).onBridgeMessage(p.msg.srcChainId, 
p.msg.srcSender, p.msg.data); 
        // Reembolsa la fianza al relayer honesto 
        uint256 bond = p.bond; 
        address rel = p.relayer; 
        delete pending[eventId]; 
        (bool ok,) = rel.call{value: bond}(""); 
        require(ok, "refund failed"); 
        emit MessageFinalized(eventId, rel); 
    } 
 
    receive() external payable {} 
} 
 
 
