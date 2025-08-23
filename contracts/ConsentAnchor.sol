// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
contract ConsentAnchor { 
    address public governance; 
    mapping(string => bytes32) public roots; // batchId => root 
    event RootStored(string indexed batchId, bytes32 root, address 
indexed by); 
 
    modifier onlyGov() { require(msg.sender == governance, "NOT_GOV"); 
_; } 
 
    constructor(address _gov) { governance = _gov; } 
 
    function setGovernance(address _gov) external onlyGov { governance 
= _gov; } 
 
    function storeRoot(bytes32 root, string calldata batchId) external 
onlyGov { 
        require(roots[batchId] == bytes32(0), "BATCH_EXISTS"); 
        roots[batchId] = root; 
        emit RootStored(batchId, root, msg.sender); 
    } 
} 
 
