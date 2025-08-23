// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
/** 
* @title GnewToken (base) 
* @author GNEW 
* @notice Token base ERC20 con Permit (EIP-2612), Votes (gobernanza), 
roles de emisión y pausa. 
* @dev Estándares: SPDX, NatSpec, semver. OpenZeppelin ^5.x. 
*/ 
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol"; 
import {ERC20Burnable} from 
"@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol"; 
import {ERC20Permit} from 
"@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol"; 
import {ERC20Votes} from 
"@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol"; 
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol"; 
import {AccessControl} from 
"@openzeppelin/contracts/access/AccessControl.sol"; 
 
contract GnewToken is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, 
Pausable, AccessControl { 
    /// @notice Rol que puede pausar el contrato. 
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE"); 
    /// @notice Rol que puede mintear. 
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE"); 
 
    /** 
     * @param name_ Nombre ERC20 
     * @param symbol_ Símbolo ERC20 
     * @param owner Dirección inicial con roles administrativos 
     * @param initialSupply Suministro inicial (en wei del token, 18 
decimales) 
     */ 
    constructor( 
        string memory name_, 
        string memory symbol_, 
        address owner, 
        uint256 initialSupply 
    ) ERC20(name_, symbol_) ERC20Permit(name_) { 
        require(owner != address(0), "owner=0"); 
        _grantRole(DEFAULT_ADMIN_ROLE, owner); 
        _grantRole(PAUSER_ROLE, owner); 
        _grantRole(MINTER_ROLE, owner); 
        if (initialSupply > 0) { 
            _mint(owner, initialSupply); 
        } 
    } 
 
    /// @notice Pausa transferencias (solo rol PAUSER_ROLE). 
    function pause() external onlyRole(PAUSER_ROLE) { 
        _pause(); 
    } 
 
    /// @notice Reactiva transferencias (solo rol PAUSER_ROLE). 
    function unpause() external onlyRole(PAUSER_ROLE) { 
        _unpause(); 
    } 
 
    /// @notice Mintea a `to` (solo rol MINTER_ROLE). 
    function mint(address to, uint256 amount) external 
onlyRole(MINTER_ROLE) { 
        _mint(to, amount); 
    } 
 
    /// @dev Hook de pausado. 
    function _update(address from, address to, uint256 value) 
        internal 
        override(ERC20, ERC20Votes) 
    { 
        require(!paused(), "paused"); 
        super._update(from, to, value); 
    } 
 
    // Solidity 0.8.24 + OZ v5: ERC20Votes requiere estos overrides. 
    function nonces(address owner) public view override(ERC20Permit) 
returns (uint256) { 
        return super.nonces(owner); 
    } 
 
    // Soporte de múltiples herencias. 
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(AccessControl) 
        returns (bool) 
    { 
        return super.supportsInterface(interfaceId); 
    } 
} 
 
