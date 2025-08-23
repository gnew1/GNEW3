
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title GovernanceTreasury
/// @notice Contrato crítico de GNEW (tesorería) sujeto a verificación formal (M2)
contract GovernanceTreasury {
    address public governance;
    mapping(address => uint256) public balances;

    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    modifier onlyGovernance() {
        require(msg.sender == governance, "no gov");
        _;
    }

    constructor(address governance_) {
        governance = governance_;
    }

    /// @notice Permite depositar fondos en la tesorería
    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Retira fondos controlados por gobernanza
    function withdraw(address payable to, uint256 amount) external onlyGovernance {
        require(address(this).balance >= amount, "insufficient");
        to.transfer(amount);
        emit Withdrawn(to, amount);
    }

    /// @notice Consulta el balance total del contrato
    function totalBalance() external view returns (uint256) {
        return address(this).balance;
    }
}


