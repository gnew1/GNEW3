// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
/** 
 * @title GnewGovTokenUUPS (opcional, proxyable) 
 * @dev Versión UUPS upgradeable. Para usar, desplegar con Proxy UUPS. 
 */ 
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol"; 
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol"; 
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol"; 
import {ERC20BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol"; 
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol"; 
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol"; 
 
contract GnewGovTokenUUPS is Initializable, ERC20Upgradeable, ERC20BurnableUpgradeable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable { 
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE"); 
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE"); 
 
    uint256 public MAX_SUPPLY; 
    uint256 public FAUCET_AMOUNT; 
    uint256 public FAUCET_COOLDOWN; 
    mapping(address => uint256) public lastFaucetAt; 
 
    event Minted(address indexed to, uint256 amount, address indexed by); 
    event Burned(address indexed from, uint256 amount, address indexed by); 
 
    function initialize( 
        string memory name_, 
        string memory symbol_, 
        address admin, 
        uint256 initialSupply, 
        uint256 cap, 
        uint256 faucetAmount, 
        uint256 faucetCooldown 
    ) public initializer { 
        require(admin != address(0), "admin=0"); 
        require(cap >= initialSupply && cap > 0, "cap"); 
        __ERC20_init(name_, symbol_); 
        __ERC20Burnable_init(); 
        __Pausable_init(); 
        __AccessControl_init(); 
        __UUPSUpgradeable_init(); 
 
        MAX_SUPPLY = cap; 
        FAUCET_AMOUNT = faucetAmount; 
        FAUCET_COOLDOWN = faucetCooldown; 
 
        _grantRole(DEFAULT_ADMIN_ROLE, admin); 
        _grantRole(PAUSER_ROLE, admin); 
        _grantRole(MINTER_ROLE, admin); 
 
        if (initialSupply > 0) { 
            _mint(admin, initialSupply); 
            emit Minted(admin, initialSupply, msg.sender); 
        } 
    } 
 
    function pause() external onlyRole(PAUSER_ROLE) { 
        _pause(); 
    } 
 
    function unpause() external onlyRole(PAUSER_ROLE) { 
        _unpause(); 
    } 
 
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) { 
        require(totalSupply() + amount <= MAX_SUPPLY, "cap exceeded"); 
        _mint(to, amount); 
        emit Minted(to, amount, msg.sender); 
    } 
 
    function faucet() external whenNotPaused { 
        require(_isTestnet(), "faucet:mainnet-blocked"); 
        require(FAUCET_AMOUNT > 0, "faucet:disabled"); 
        uint256 last = lastFaucetAt[msg.sender]; 
        require(block.timestamp >= last + FAUCET_COOLDOWN, 
"faucet:cooldown"); 
        lastFaucetAt[msg.sender] = block.timestamp; 
    require(totalSupply() + FAUCET_AMOUNT <= MAX_SUPPLY, "cap exceeded"); 
        _mint(msg.sender, FAUCET_AMOUNT); 
        emit Minted(msg.sender, FAUCET_AMOUNT, address(this)); 
    } 
 
    function burn(uint256 value) public override whenNotPaused { 
        super.burn(value); 
        emit Burned(msg.sender, value, msg.sender); 
    } 
 
    function burnFrom(address account, uint256 value) public override whenNotPaused { 
        super.burnFrom(account, value); 
        emit Burned(account, value, msg.sender); 
    } 
 
    function _authorizeUpgrade(address newImplementation) internal 
override onlyRole(DEFAULT_ADMIN_ROLE) {} 
 
    function _update(address from, address to, uint256 value) internal override(ERC20Upgradeable) { 
        require(!paused(), "paused"); 
        super._update(from, to, value); 
    } 
 
    function _isTestnet() internal view returns (bool) { 
        uint256 id = block.chainid; 
        if (id == 1 || id == 137) return false; 
        return true; 
    } 
 
    function supportsInterface(bytes4 interfaceId) public view override(AccessControlUpgradeable) returns (bool) { 
        return super.supportsInterface(interfaceId); 
    } 
} 
 

