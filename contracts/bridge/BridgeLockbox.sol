// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
 
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"; 
import "@openzeppelin/contracts/access/AccessControl.sol"; 
import "./IBridgeReceiver.sol"; 
import "./BridgeMessenger.sol"; 
import "./WrappedERC20.sol"; 
 
/// @title BridgeLockbox (PoC) 
/// @notice Escrow para ERC20 en el chain origen y minteo de wrapped 
en el chain destino. 
///         Implementa onBridgeMessage para MINT/UNLOCK. 
contract BridgeLockbox is AccessControl, IBridgeReceiver { 
    using SafeERC20 for IERC20; 
 
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE"); 
 
    BridgeMessenger public immutable messenger; 
 
    // Registro de tokens soportados en este chain 
    mapping(address => bool) public supportedToken; 
 
    // Mapeo (chainOrigen => tokenOrigen => wrappedEnEsteChain) 
    mapping(uint256 => mapping(address => address)) public wrappedOf;  
 
    // Identificadores de acción 
    bytes4 private constant ACTION_MINT   = bytes4(keccak256("MINT")); 
    bytes4 private constant ACTION_UNLOCK = 
bytes4(keccak256("UNLOCK")); 
 
    event SupportedSet(address indexed token, bool allowed); 
    event WrappedRegistered(uint256 indexed originChain, address 
indexed originToken, address indexed wrapped); 
    event Locked(address indexed token, address indexed from, uint256 
amount, uint256 dstChain, address dstReceiver, bytes32 eventId); 
    event BurnRequested(address indexed wrapped, address indexed from, 
uint256 amount, uint256 originChain, address originToken, bytes32 
eventId); 
 
    constructor(address admin, BridgeMessenger _messenger) { 
        messenger = _messenger; 
        _grantRole(DEFAULT_ADMIN_ROLE, admin); 
        _grantRole(ADMIN_ROLE, admin); 
    } 
 
    function setSupported(address token, bool allowed) external 
onlyRole(ADMIN_ROLE) { 
        supportedToken[token] = allowed; 
        emit SupportedSet(token, allowed); 
    } 
 
    function registerWrapped(uint256 originChainId, address 
originToken, address wrapped) external onlyRole(ADMIN_ROLE) { 
        wrappedOf[originChainId][originToken] = wrapped; 
        // otorgar minter al lockbox (este contrato) si es 
WrappedERC20 
        if (wrapped != address(0)) { 
            try 
WrappedERC20(wrapped).grantRole(WrappedERC20(wrapped).MINTER_ROLE(), 
address(this)) {} catch {} 
        } 
        emit WrappedRegistered(originChainId, originToken, wrapped); 
    } 
 
    // -------------------- ORIGEN: lock y envía mensaje para mintear 
en destino -------------------- 
    function bridgeERC20(address token, uint256 amount, uint256 
dstChainId, address dstLockbox) external returns (bytes32 eventId) { 
        require(supportedToken[token], "unsupported"); 
        IERC20(token).safeTransferFrom(msg.sender, address(this), 
amount); 
        bytes memory data = abi.encode(ACTION_MINT, block.chainid, 
token, msg.sender, amount); 
        eventId = messenger.sendMessage(dstLockbox, dstChainId, data); 
        emit Locked(token, msg.sender, amount, dstChainId, msg.sender, 
eventId); 
    } 
 
    // -------------------- DESTINO: usuario solicita quemar wrapped y 
regresar a origen ----------- 
    function returnToOrigin( 
        address wrapped, 
        uint256 amount, 
        uint256 originChainId, 
        address originLockbox, 
        address originToken, 
        address recipientOnOrigin 
    ) external returns (bytes32 eventId) { 
        // quemar wrapped del usuario 
        WrappedERC20(wrapped).burnFrom(msg.sender, amount); 
        bytes memory data = abi.encode(ACTION_UNLOCK, originChainId, 
originToken, recipientOnOrigin, amount); 
        eventId = messenger.sendMessage(originLockbox, originChainId, 
data); 
        emit BurnRequested(wrapped, msg.sender, amount, originChainId, 
originToken, eventId); 
    } 
 
    // -------------------- INBOX: ejecución al finalizar mensaje ---------------------------------- 
    function onBridgeMessage(uint256 srcChainId, address 
/*srcSender*/, bytes calldata data) external override { 
        require(msg.sender == address(messenger), "only messenger"); 
        bytes4 action = bytes4(data[0:4]); 
        if (action == ACTION_MINT) { 
            ( , uint256 originChain, address originToken, address to, 
uint256 amount) = 
                abi.decode(data, (bytes4, uint256, address, address, 
uint256)); 
            address wrapped = wrappedOf[originChain][originToken]; 
            require(wrapped != address(0), "no wrapped"); 
            WrappedERC20(wrapped).mint(to, amount); 
        } else if (action == ACTION_UNLOCK) { 
            ( , uint256 /*originChain*/, address token, address to, 
uint256 amount) = 
                abi.decode(data, (bytes4, uint256, address, address, 
uint256)); 
            require(supportedToken[token], "unsupported"); 
            IERC20(token).safeTransfer(to, amount); 
        } else { 
            revert("unknown action"); 
        } 
    } 
} 
 
 
