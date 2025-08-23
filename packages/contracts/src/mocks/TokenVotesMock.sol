// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol"; 
import {ERC20Permit} from 
"@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol"; 
import {ERC20Votes} from 
"@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol"; 
import {AccessControl} from 
"@openzeppelin/contracts/access/AccessControl.sol"; 
 
/** 
 * @dev Token de pruebas compatible con IVotes (mintable). 
 */ 
contract TokenVotesMock is ERC20, ERC20Permit, ERC20Votes, 
AccessControl { 
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE"); 
 
    constructor() ERC20("MockTokenVotes", "MTV") 
ERC20Permit("MockTokenVotes") { 
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender); 
        _grantRole(MINTER_ROLE, msg.sender); 
    } 
 
    function mint(address to, uint256 amount) external 
onlyRole(MINTER_ROLE) { 
        _mint(to, amount); 
    } 
 
    // Requeridos por Solidity para múltiples herencias 
    function _update(address from, address to, uint256 value) 
        internal 
        override(ERC20, ERC20Votes) 
    { 
        super._update(from, to, value); 
    } 
 
    function nonces(address owner) public view override(ERC20Permit) 
returns (uint256) { 
        return super.nonces(owner); 
    } 
} 
 
