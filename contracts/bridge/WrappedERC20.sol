// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
 
import "@openzeppelin/contracts/token/ERC20/ERC20.sol"; 
import "@openzeppelin/contracts/access/AccessControl.sol"; 
 
/// @notice Token envuelto (PoC) minteado por el Lockbox destino. 
contract WrappedERC20 is ERC20, AccessControl { 
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE"); 
 
    constructor(string memory n, string memory s, address admin) 
ERC20(n, s) { 
        _grantRole(DEFAULT_ADMIN_ROLE, admin); 
        _grantRole(MINTER_ROLE, admin); 
    } 
 
    function mint(address to, uint256 amount) external 
onlyRole(MINTER_ROLE) { 
        _mint(to, amount); 
    } 
 
    /// @notice Quemado por el Lockbox (requiere aprobación previa si 
quema en nombre del usuario). 
    function burnFrom(address account, uint256 amount) external { 
        if (msg.sender != account) { 
            uint256 allowed = allowance(account, msg.sender); 
            require(allowed >= amount, "allowance"); 
            _approve(account, msg.sender, allowed - amount); 
        } 
        _burn(account, amount); 
    } 
} 
 
 
