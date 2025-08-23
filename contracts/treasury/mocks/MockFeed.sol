// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
 
contract MockFeed { 
  int256 public answer; 
  uint8 public immutable decimals = 8; 
  constructor(int256 a){answer=a;} 
  function latestRoundData() external view returns (uint80, int256, 
uint256, uint256, uint80) { 
    return (0, answer, block.timestamp, block.timestamp, 0); 
  } 
  function setAnswer(int256 a) external { answer = a; } 
} 
 
 
