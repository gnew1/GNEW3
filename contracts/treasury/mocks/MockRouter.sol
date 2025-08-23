// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
 
import "../treasury/StrategyVault.sol"; // for ISimpleRouter 
import "./MockERC20.sol"; 
 
contract MockRouter is ISimpleRouter { 
  function swapExactTokensForTokens( 
    address tokenIn, 
    address tokenOut, 
    uint256 amountIn, 
    uint256 minAmountOut, 
    address to 
  ) external returns (uint256 out) { 
    // Simula un precio fijo 1:1 (puedes ajustar a tests) 
    MockERC20(tokenIn).transferFrom(msg.sender, address(this), 
amountIn); 
    out = amountIn; // 1:1 
    require(out >= minAmountOut, "minOut"); 
    MockERC20(tokenOut).mint(to, out); 
  } 
} 
 
