// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PolicyRegistry — Versionado on-chain de políticas de autorización (RBAC/ABAC)
/// @notice Gobernado por DAO (owner = Governor/Timelock). Off-chain cache verifica hash y aplica la política.
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract PolicyRegistry is Ownable2Step {
    struct Policy {
        uint256 version;
        string uri;      // p.ej. ipfs://cid o https://.../bundle.tgz
        bytes32 hash;    // keccak256 del contenido (model.conf + policy.csv concatenados o bundle)
        uint64  activatedAt;
    }

    uint256 public activeVersion;
    mapping(uint256 => Policy) public policies;

    event PolicyStaged(uint256 indexed version, string uri, bytes32 hash);
    event PolicyActivated(uint256 indexed version, string uri, bytes32 hash);

    /// @notice Registra (staging) una nueva versión de política. La activación puede ser separada si lo prefiere la DAO.
    function stagePolicy(uint256 version, string calldata uri, bytes32 hash) external onlyOwner {
        require(version > activeVersion, "version must increase");
        policies[version] = Policy({version: version, uri: uri, hash: hash, activatedAt: 0});
        emit PolicyStaged(version, uri, hash);
    }

    /// @notice Activa una versión ya registrada (o registra y activa en uno).
    function activatePolicy(uint256 version, string calldata uri, bytes32 hash) external onlyOwner {
        if (policies[version].version == 0) {
            policies[version] = Policy({version: version, uri: uri, hash: hash, activatedAt: 0});
            emit PolicyStaged(version, uri, hash);
        }
        activeVersion = version;
        policies[version].activatedAt = uint64(block.timestamp);
        emit PolicyActivated(version, policies[version].uri, policies[version].hash);
    }

    function activePolicy() external view returns (Policy memory) {
        require(activeVersion != 0, "no active policy");
        return policies[activeVersion];
    }
}

