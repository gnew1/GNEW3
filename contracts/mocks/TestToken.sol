// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
 
import "@openzeppelin/contracts/token/ERC20/ERC20.sol"; 
 
contract TestToken is ERC20 { 
    constructor() ERC20("TestToken", "TT") { 
        _mint(msg.sender, 1e24); // 1M TT con 18 dec 
    } 
 
    function mint(address to, uint256 amount) external { 
        _mint(to, amount); 
    } 
} 
 
 
