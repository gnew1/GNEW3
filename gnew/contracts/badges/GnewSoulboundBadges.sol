// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
/** 
* GnewSoulboundBadges (SBT) 
* - ERC721 no transferible con EIP-5192 (locked) 
* - Tipos de badge configurables por admins/guilds (MINTER_ROLE para 
emisión) 
 * - Metadata por token (tokenURI), enlace a issuer DID y vcHash 
(N121/N122) 
 */ 
 
import {ERC165} from 
"openzeppelin-contracts/contracts/utils/introspection/ERC165.sol"; 
import {ERC721} from 
"openzeppelin-contracts/contracts/token/ERC721/ERC721.sol"; 
import {AccessControl} from 
"openzeppelin-contracts/contracts/access/AccessControl.sol"; 
import {Strings} from 
"openzeppelin-contracts/contracts/utils/Strings.sol"; 
import {Counters} from 
"openzeppelin-contracts/contracts/utils/Counters.sol"; 
 
interface IERC5192 /* is IERC165 */ { 
    /// @dev Emitted when the locking status is set to locked. 
    event Locked(uint256 tokenId); 
    /// @dev Emitted when the locking status is set to unlocked. 
    event Unlocked(uint256 tokenId); 
    /// @dev Returns the locking status of an Soulbound Token 
    function locked(uint256 tokenId) external view returns (bool); 
} 
 
contract GnewSoulboundBadges is ERC721, AccessControl, IERC5192 { 
    using Counters for Counters.Counter; 
    using Strings for uint256; 
 
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE"); 
 
    Counters.Counter private _tokenId; 
    string public baseURI; 
 
    struct BadgeType { 
        string name;            // p.ej. "Core Contributor" 
        string description;     // breve texto 
        string image;           // ipfs://CID del icono 
        uint16 points;          // para "Mi economía" (N29) 
        uint8  rarity;          // 0-5 
        bool   revocableByOwner;// permitir burn por el holder 
        bool   active;          // allow mint 
    } 
 
    struct BadgeData { 
        uint256 badgeTypeId; 
        string  tokenURI;       // ipfs://CID metadata JSON 
        string  issuerDid;      // N121 
        bytes32 vcHash;         // hash de la VC (N122) opcional 
    } 
 
    // storage 
    mapping(uint256 => BadgeType) public badgeTypes; // id => type 
    uint256 public badgeTypeCount; 
    mapping(uint256 => BadgeData) public badgeData;  // tokenId => 
data 
 
    // --- Events --- 
    event BadgeTypeCreated(uint256 indexed typeId, string name); 
    event BadgeTypeUpdated(uint256 indexed typeId, string name, bool 
active); 
    event BadgeMinted(uint256 indexed tokenId, address indexed to, 
uint256 indexed typeId, string tokenURI); 
    event BadgeBurned(uint256 indexed tokenId, address indexed owner); 
 
    constructor(address admin, string memory _name, string memory 
_symbol, string memory _baseURI) 
        ERC721(_name, _symbol) 
    { 
        _grantRole(DEFAULT_ADMIN_ROLE, admin); 
        _grantRole(MINTER_ROLE, admin); 
        baseURI = _baseURI; 
    } 
 
    // ---- IERC165 ---- 
    function supportsInterface(bytes4 interfaceId) public view virtual 
override(ERC721, AccessControl) returns (bool) { 
        return 
            interfaceId == type(IERC5192).interfaceId || 
            ERC721.supportsInterface(interfaceId) || 
            AccessControl.supportsInterface(interfaceId); 
    } 
 
    // ---- EIP-5192 ---- 
    function locked(uint256 tokenId) external view override returns 
(bool) { 
        _requireOwned(tokenId); 
        return true; // siempre bloqueado (soulbound) 
    } 
 
    // ---- Badge Types ---- 
    function createBadgeType(BadgeType calldata t) external 
onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256 typeId) { 
        typeId = ++badgeTypeCount; 
        badgeTypes[typeId] = t; 
        emit BadgeTypeCreated(typeId, t.name); 
    } 
 
    function updateBadgeType(uint256 typeId, BadgeType calldata t) 
external onlyRole(DEFAULT_ADMIN_ROLE) { 
        require(typeId > 0 && typeId <= badgeTypeCount, "bad type"); 
        badgeTypes[typeId] = t; 
        emit BadgeTypeUpdated(typeId, t.name, t.active); 
    } 
 
    // ---- Mint / Burn ---- 
    function mint(address to, uint256 typeId, string calldata 
_tokenURI, string calldata issuerDid, bytes32 vcHash)  
        external onlyRole(MINTER_ROLE) returns (uint256 id) 
    { 
        BadgeType memory t = badgeTypes[typeId]; 
        require(t.active, "type inactive"); 
 
        id = ++_tokenId; 
        _safeMint(to, id); 
        badgeData[id] = BadgeData({ 
            badgeTypeId: typeId, 
            tokenURI: _tokenURI, 
            issuerDid: issuerDid, 
            vcHash: vcHash 
        }); 
        emit Locked(id); 
        emit BadgeMinted(id, to, typeId, _tokenURI); 
    } 
 
    /// @notice El owner puede quemar su SBT si el tipo lo permite; 
admin siempre puede. 
    function burn(uint256 tokenId) external { 
        address owner = _ownerOf(tokenId); 
        require(owner != address(0), "not minted"); 
        BadgeType memory t = 
badgeTypes[badgeData[tokenId].badgeTypeId]; 
        bool isAdmin = hasRole(DEFAULT_ADMIN_ROLE, msg.sender); 
        require(msg.sender == owner ? t.revocableByOwner : isAdmin, 
"not allowed"); 
        _burn(tokenId); 
        delete badgeData[tokenId]; 
        emit BadgeBurned(tokenId, owner); 
        emit Unlocked(tokenId); // semántico: ya no existe; evento 
informativo 
    } 
 
    // ---- Non-transferability (hard lock) ---- 
    function approve(address, uint256) public pure override { 
        revert("SBT:NON_TRANSFERABLE"); 
    } 
 
    function setApprovalForAll(address, bool) public pure override { 
        revert("SBT:NON_TRANSFERABLE"); 
    } 
 
    function transferFrom(address, address, uint256) public pure 
override { 
        revert("SBT:NON_TRANSFERABLE"); 
    } 
 
    function safeTransferFrom(address, address, uint256) public pure 
override { 
        revert("SBT:NON_TRANSFERABLE"); 
    } 
 
    function safeTransferFrom(address, address, uint256, bytes memory) 
public pure override { 
        revert("SBT:NON_TRANSFERABLE"); 
    } 
 
    // ---- Metadata ---- 
    function _baseURI() internal view override returns (string memory) 
{ 
        return baseURI; 
    } 
 
    function tokenURI(uint256 tokenId) public view override returns 
(string memory) { 
        _requireOwned(tokenId); 
        string memory u = badgeData[tokenId].tokenURI; 
        if (bytes(u).length > 0) return u; // ipfs://CID específico 
        // fallback: baseURI + tokenId.json 
        return string(abi.encodePacked(baseURI, tokenId.toString(), 
".json")); 
    } 
} 
 
 
/gnew/contracts/badges/GnewSBTClaimer.sol (opcional, 
para “claim por firma” y gasless N120) 
// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
import {AccessControl} from 
"openzeppelin-contracts/contracts/access/AccessControl.sol"; 
import {ECDSA} from 
"openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol"; 
import {GnewSoulboundBadges} from "./GnewSoulboundBadges.sol"; 
 
/** 
 * Permite al usuario "reclamar" (mint) su badge presentando un 
voucher firmado por ISSUER_SIGNER. 
 * Útil para flujos gasless (N120) y para integrar verificaciones 
off-chain previas (N122). 
 */ 
contract GnewSBTClaimer is AccessControl { 
    using ECDSA for bytes32; 
 
    bytes32 public constant ISSUER_SIGNER = 
keccak256("ISSUER_SIGNER"); 
    GnewSoulboundBadges public immutable sbt; 
 
    // EIP-712 domain (simplificado) 
    bytes32 private immutable _DOMAIN_SEPARATOR; 
    bytes32 private constant _TYPEHASH = keccak256( 
        "Voucher(address to,uint256 typeId,string tokenURI,string 
issuerDid,bytes32 vcHash,uint256 nonce,uint256 deadline)" 
    ); 
    mapping(address => uint256) public nonces; 
 
    event Claimed(address indexed to, uint256 indexed tokenId, uint256 
indexed typeId); 
 
    constructor(address admin, GnewSoulboundBadges _sbt) { 
        _grantRole(DEFAULT_ADMIN_ROLE, admin); 
        _DOMAIN_SEPARATOR = keccak256( 
            abi.encode( 
                keccak256("EIP712Domain(string name,string 
version,uint256 chainId,address verifyingContract)"), 
                keccak256(bytes("GnewSBTClaimer")), 
keccak256(bytes("1")), block.chainid, address(this) 
            ) 
        ); 
        sbt = _sbt; 
    } 
 
    function domainSeparator() public view returns (bytes32) { return 
_DOMAIN_SEPARATOR; } 
 
    function claim( 
        address to, 
        uint256 typeId, 
        string calldata tokenURI_, 
        string calldata issuerDid, 
        bytes32 vcHash, 
        uint256 deadline, 
        bytes calldata sig 
    ) external returns (uint256 tokenId) { 
        require(block.timestamp <= deadline, "expired"); 
        uint256 nonce = nonces[to]++; 
        bytes32 structHash = keccak256(abi.encode(_TYPEHASH, to, 
typeId, keccak256(bytes(tokenURI_)), keccak256(bytes(issuerDid)), 
vcHash, nonce, deadline)); 
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", 
_DOMAIN_SEPARATOR, structHash)); 
        address signer = digest.recover(sig); 
        require(hasRole(ISSUER_SIGNER, signer), "invalid signer"); 
 
        tokenId = sbt.mint(to, typeId, tokenURI_, issuerDid, vcHash); 
        emit Claimed(to, tokenId, typeId); 
    } 
} 
 
 
