// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockToken {
    string public name = "MockToken";
    string public symbol = "MCK";
    uint8 public decimals = 18;
    mapping(address=>uint256) public balanceOf;
    event Transfer(address indexed from, address indexed to, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}

