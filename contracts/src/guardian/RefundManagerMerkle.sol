// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Errors} from "../errors/Errors.sol";

/// @title RefundManager (Merkle) — reembolsos a víctimas con prueba Merkle.
/// @notice Fondos custodiados aparte (p. ej., en RescueVault que aprueba allowance a este contrato).
contract RefundManagerMerkle is Ownable2Step, Pausable {
    IERC20 public immutable asset; // address(0) para ETH no soportado aquí (usar versión ETH si necesitas).
    bytes32 public merkleRoot;
    mapping(address => uint256) public claimed;
    address public denylist; // contrato opcional de lista denegada (legal)

    event RootUpdated(bytes32 root);
    event DenylistSet(address denylist);
    event Refunded(address indexed to, uint256 amount);

    constructor(IERC20 _asset, bytes32 _root) {
        if (address(_asset) == address(0)) revert Errors.ZeroAddress();
        asset = _asset;
        merkleRoot = _root;
    }

    function setRoot(bytes32 root) external onlyOwner {
        merkleRoot = root;
        emit RootUpdated(root);
    }

    function setDenylist(address _deny) external onlyOwner { denylist = _deny; emit DenylistSet(_deny); }

    function refund(address to, uint256 totalEligible, bytes32[] calldata proof) external whenNotPaused {
        if (to == address(0)) revert Errors.ZeroAddress();
        if (!_eligible(to, totalEligible, proof)) revert Errors.Unauthorized();
        uint256 already = claimed[to];
        if (already >= totalEligible) revert Errors.InvalidAmount();
        uint256 due = totalEligible - already;
        claimed[to] = totalEligible;
        asset.transfer(to, due);
        emit Refunded(to, due);
    }

    function _eligible(address to, uint256 totalEligible, bytes32[] calldata proof) internal view returns (bool) {
        if (denylist != address(0) && IDenylist(denylist).blocked(to)) return false;
        bytes32 leaf = keccak256(abi.encode(to, totalEligible));
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }
}

interface IDenylist { function blocked(address a) external view returns (bool); }

