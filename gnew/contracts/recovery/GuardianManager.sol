// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
import {AccessControl} from 
"openzeppelin-contracts/contracts/access/AccessControl.sol"; 
 
/** 
 * GuardianManager 
 * - Mantiene M guardians y threshold N. 
 * - Cambios administrados por OWNER_ROLE con "churn delay" para 
minimizar abusos. 
 */ 
contract GuardianManager is AccessControl { 
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE"); 
 
    mapping(address => bool) public isGuardian; 
    address[] public guardians; 
    uint256 public threshold;          // N 
    uint64  public lastChangeAt; 
    uint64  public churnDelay = 1 days; 
 
    event GuardianAdded(address g); 
    event GuardianRemoved(address g); 
    event ThresholdChanged(uint256 newN); 
    event ChurnDelayChanged(uint64 newDelay); 
 
    constructor(address owner, address[] memory initial, uint256 N) { 
        _grantRole(OWNER_ROLE, owner); 
        for (uint i=0;i<initial.length;i++) { 
            if (!isGuardian[initial[i]]) { isGuardian[initial[i]] = 
true; guardians.push(initial[i]); emit GuardianAdded(initial[i]); } 
        } 
        threshold = N; 
        lastChangeAt = uint64(block.timestamp); 
    } 
 
    modifier onlyOwner() { require(hasRole(OWNER_ROLE, msg.sender), 
"not owner"); _; } 
    modifier afterDelay() { require(block.timestamp >= lastChangeAt + 
churnDelay, "churn delay"); _; } 
 
    function setChurnDelay(uint64 d) external onlyOwner { churnDelay = 
d; emit ChurnDelayChanged(d); } 
 
    function addGuardian(address g) external onlyOwner afterDelay { 
        require(!isGuardian[g], "exists"); 
        isGuardian[g] = true; guardians.push(g); lastChangeAt = 
uint64(block.timestamp); 
        emit GuardianAdded(g); 
    } 
 
    function removeGuardian(address g) external onlyOwner afterDelay { 
        require(isGuardian[g], "not guardian"); 
        isGuardian[g] = false; lastChangeAt = uint64(block.timestamp); 
        for (uint i=0;i<guardians.length;i++) if (guardians[i]==g) { 
guardians[i]=guardians[guardians.length-1]; guardians.pop(); break; } 
        emit GuardianRemoved(g); 
    } 
 
    function setThreshold(uint256 N) external onlyOwner afterDelay { 
        require(N>0 && N<=guardians.length, "bad N"); 
        threshold = N; lastChangeAt = uint64(block.timestamp); 
emit ThresholdChanged(N); 
} 
function getGuardians() external view returns (address[] memory) { 
return guardians; } 
} 
