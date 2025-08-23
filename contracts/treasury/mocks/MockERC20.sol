// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
contract MockERC20 { 
string public name; string public symbol; uint8 public decimals = 
18; 
uint256 public totalSupply; 
mapping(address => uint256) public balanceOf; 
mapping(address => mapping(address => uint256)) public allowance; 
constructor(string memory n, string memory s) { name=n; symbol=s; } 
function mint(address to, uint256 a) external { balanceOf[to]+=a; 
totalSupply+=a; emit Transfer(address(0),to,a); } 
function approve(address s, uint256 a) external returns (bool){ 
allowance[msg.sender][s]=a; emit Approval(msg.sender,s,a); return 
true; } 
function transfer(address to, uint256 a) external returns (bool){ 
_xfer(msg.sender,to,a); return true; } 
function transferFrom(address f, address to, uint256 a) external 
returns (bool){ 
uint256 al=allowance[f][msg.sender]; require(al>=a,"allow"); 
allowance[f][msg.sender]=al-a; _xfer(f,to,a); return true; 
} 
function _xfer(address f,address t,uint256 a) internal { 
require(balanceOf[f]>=a,"bal"); balanceOf[f]-=a; balanceOf[t]+=a; emit 
Transfer(f,t,a); } 
 
  event Transfer(address indexed from,address indexed to,uint256 
value); 
  event Approval(address indexed owner,address indexed spender,uint256 
value); 
} 
 
