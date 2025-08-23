// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Votación privada con zkSNARKs (Groth16)
/// @notice Verifica pertenencia (Merkle root), nullificador único y opción de voto válida sin revelar identidad.
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/IVerifierGroth16.sol";
import "../errors/Errors.sol";

contract BallotZK is Ownable {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    IVerifierGroth16 public verifier;
    bytes32 public merkleRoot;           // raíz actual del censo
    uint8 public options;                // número de opciones válidas
    EnumerableSet.Bytes32Set private usedNullifiers;

    event RootUpdated(bytes32 root);
    event VoteCast(bytes32 nullifierHash, uint8 option);

    constructor(IVerifierGroth16 _verifier, bytes32 _root, uint8 _options) {
        if (address(_verifier) == address(0)) revert Errors.ZeroAddress();
        if (_options == 0) revert Errors.InvalidAmount();
        verifier = _verifier;
        merkleRoot = _root;
        options = _options;
    }

    function setRoot(bytes32 newRoot) external onlyOwner {
        merkleRoot = newRoot;
        emit RootUpdated(newRoot);
    }

    /// @notice Verificación Groth16 estándar. `publicSignals` = [root, nullifierHash, voteOption]
    function vote(
        uint[2] calldata a, uint[2][2] calldata b, uint[2] calldata c, uint256[] calldata publicSignals
    ) external {
        if (publicSignals.length != 3) revert Errors.InvalidAmount();
        bytes32 root = bytes32(publicSignals[0]);
        bytes32 nullifierHash = bytes32(publicSignals[1]);
        uint256 option = publicSignals[2];

        if (root != merkleRoot) revert Errors.InvalidState();
        if (option >= options) revert Errors.InvalidAmount();
        if (usedNullifiers.contains(nullifierHash)) revert Errors.InvalidState();

        bool ok = verifier.verifyProof(a, b, c, publicSignals);
        if (!ok) revert Errors.Unauthorized();

        usedNullifiers.add(nullifierHash);
        emit VoteCast(nullifierHash, uint8(option));
    }

    function hasVoted(bytes32 nullifierHash) external view returns (bool) {
        return usedNullifiers.contains(nullifierHash);
    }
}

