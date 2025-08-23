// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Retiro privado con prueba de balance >= amount
/// @dev Demuestra que el compromiso C oculta un balance >= amount (Groth16).
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IVerifierGroth16.sol";
import "../errors/Errors.sol";

contract RangeWithdraw is Ownable {
    IVerifierGroth16 public verifier;
    mapping(bytes32 => bool) public spentCommitment; // opcional: prevenir reuso

    event Withdraw(bytes32 commitment, address to, uint256 amount);

    constructor(IVerifierGroth16 _verifier) {
        if (address(_verifier) == address(0)) revert Errors.ZeroAddress();
        verifier = _verifier;
    }

    /// @param publicSignals [C, amount]
    function withdraw(
        uint[2] calldata a, uint[2][2] calldata b, uint[2] calldata c, uint256[] calldata publicSignals, address to
    ) external {
        if (publicSignals.length != 2) revert Errors.InvalidAmount();
        bytes32 C = bytes32(publicSignals[0]);
        uint256 amount = publicSignals[1];
        if (amount == 0) revert Errors.InvalidAmount();
        if (to == address(0)) revert Errors.ZeroAddress();
        if (spentCommitment[C]) revert Errors.InvalidState();

        bool ok = verifier.verifyProof(a, b, c, publicSignals);
        if (!ok) revert Errors.Unauthorized();

        spentCommitment[C] = true;
        (bool s, ) = to.call{value: amount}("");
        if (!s) revert Errors.CallFailed();
        emit Withdraw(C, to, amount);
    }

    receive() external payable {}
}

