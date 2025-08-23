// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IGuardianTarget} from "./IGuardianTarget.sol";
import {Errors} from "../errors/Errors.sol";

/// @title GuardianCouncil — Multisig on-chain simple (M-de-N) para acciones de emergencia.
/// @notice El owner debe ser la DAO/timelock principal. Este contrato NO mueve fondos por sí mismo:
///         coordina: (1) pausa de contratos target y (2) programación de operaciones en el timelock de emergencia.
contract GuardianCouncil is AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");      // Gobernanza (DAO/Timelock)
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");   // Guardianes
    uint256 public quorum; // mínimo confirmaciones requeridas (M)

    address public immutable emergencyTimelock; // Timelock de emergencia (OZ TimelockController)
    EnumerableSet.AddressSet private _targets;  // contratos críticos registrados (permit-list para acciones)

    struct Action {
        // Acción de emergencia genérica: target + selector + datos
        address target;
        bytes   data;
        uint48  eta;     // cuando podría ejecutarse (programado vía timelock)
        uint8   confirms;
        bool    executed;
        bytes32 rationaleHash; // hash a documento público (IPFS/URL) con detalles del incidente
    }

    mapping(bytes32 => Action) public actions;              // actionId => Action
    mapping(bytes32 => mapping(address => bool)) public approvedBy; // actionId => guardian => approved?

    event GuardianAdded(address indexed g);
    event GuardianRemoved(address indexed g);
    event QuorumUpdated(uint256 newQuorum);
    event TargetAdded(address indexed target);
    event TargetRemoved(address indexed target);

    event ActionProposed(bytes32 indexed id, address indexed target, bytes data, bytes32 rationaleHash);
    event ActionApproved(bytes32 indexed id, address indexed guardian, uint256 approvals);
    event ActionScheduled(bytes32 indexed id, uint48 eta);
    event ActionExecuted(bytes32 indexed id);

    constructor(address _emergencyTimelock, address admin, address[] memory guardians, uint256 _quorum) {
        if (_emergencyTimelock == address(0) || admin == address(0)) revert Errors.ZeroAddress();
        emergencyTimelock = _emergencyTimelock;
        _grantRole(ADMIN_ROLE, admin);
        _setRoleAdmin(GUARDIAN_ROLE, ADMIN_ROLE);

        for (uint256 i; i < guardians.length; ++i) {
            _grantRole(GUARDIAN_ROLE, guardians[i]);
            emit GuardianAdded(guardians[i]);
        }
        _updateQuorum(_quorum);
    }

    // --- Admin (DAO) ---

    function addTargets(address[] calldata targets_) external onlyRole(ADMIN_ROLE) {
        for (uint256 i; i < targets_.length; ++i) {
            if (targets_[i] == address(0)) revert Errors.ZeroAddress();
            _targets.add(targets_[i]);
            emit TargetAdded(targets_[i]);
        }
    }

    function removeTargets(address[] calldata targets_) external onlyRole(ADMIN_ROLE) {
        for (uint256 i; i < targets_.length; ++i) {
            _targets.remove(targets_[i]);
            emit TargetRemoved(targets_[i]);
        }
    }

    function setQuorum(uint256 q) external onlyRole(ADMIN_ROLE) { _updateQuorum(q); }

    function _updateQuorum(uint256 q) internal {
        if (q == 0) revert Errors.InvalidAmount();
        if (q > getRoleMemberCount(GUARDIAN_ROLE)) revert Errors.InvalidAmount();
        quorum = q;
        emit QuorumUpdated(q);
    }

    // --- Guardianes ---

    /// @notice Proponer una acción de emergencia. Solo targets permitidos; no ejecuta aún.
    function proposeAction(address target, bytes calldata data, bytes32 rationaleHash) external onlyRole(GUARDIAN_ROLE) returns (bytes32 id) {
        if (!_targets.contains(target)) revert Errors.Unauthorized();
        id = keccak256(abi.encode(block.chainid, address(this), target, data, rationaleHash, block.timestamp));
        Action storage a = actions[id];
        if (a.target != address(0)) revert Errors.InvalidState();
        a.target = target;
        a.data = data;
        a.rationaleHash = rationaleHash;
        emit ActionProposed(id, target, data, rationaleHash);
        _approve(id); // cuenta la aprobación del proponente
    }

    /// @notice Aprobar acción ya propuesta. Ejecutable cuando alcanza quorum y está programada en el timelock.
    function approve(bytes32 id) external onlyRole(GUARDIAN_ROLE) {
        if (actions[id].target == address(0)) revert Errors.InvalidState();
        _approve(id);
    }

    function _approve(bytes32 id) internal {
        if (approvedBy[id][msg.sender]) revert Errors.InvalidState();
        approvedBy[id][msg.sender] = true;
        unchecked { actions[id].confirms += 1; }
        emit ActionApproved(id, msg.sender, actions[id].confirms);
    }

    /// @notice Llamada directa de PAUSA (fuera de timelock) — rápida, solamente si la función es `pause()`.
    function fastPause(address target, bytes32 rationaleHash) external onlyRole(GUARDIAN_ROLE) {
        if (!_targets.contains(target)) revert Errors.Unauthorized();
        // Requiere quorum: cada guardián llama; al alcanzar quorum se ejecuta pause()
        bytes memory data = abi.encodeWithSignature("pause()");
        bytes32 id = keccak256(abi.encode("PAUSE", target, rationaleHash));
        if (actions[id].target == address(0)) {
            actions[id] = Action({target: target, data: data, eta: 0, confirms: 0, executed: false, rationaleHash: rationaleHash});
            emit ActionProposed(id, target, data, rationaleHash);
        }
        _approve(id);
        if (actions[id].confirms >= quorum && !actions[id].executed) {
            (bool ok,) = target.call(data);
            require(ok, "pause failed");
            actions[id].executed = true;
            emit ActionExecuted(id);
        }
    }

    /// @notice Programar en timelock una acción genérica (ej. emergencySweep) una vez alcanzado el quorum.
    /// @dev El GuardianCouncil debe tener PROPOSER_ROLE en el timelock de emergencia; ETA lo gestiona el timelock.
    function scheduleViaTimelock(bytes32 id, bytes32 predecessor, bytes32 salt) external onlyRole(GUARDIAN_ROLE) {
        Action storage a = actions[id];
        if (a.target == address(0) || a.executed) revert Errors.InvalidState();
        if (a.confirms < quorum) revert Errors.Unauthorized();

        // TimelockController.schedule(target, value, data, predecessor, salt, delay)
        (bool ok, bytes memory ret) = emergencyTimelock.call(
            abi.encodeWithSignature("schedule(address,uint256,bytes,bytes32,bytes32,uint256)", a.target, 0, a.data, predecessor, salt, 0)
        );
        require(ok, "schedule failed");
        // fetch timestamp
        (, bytes memory getTs) = emergencyTimelock.call(
            abi.encodeWithSignature("getTimestamp(bytes32)", keccak256(abi.encode(a.target, uint256(0), a.data, predecessor, salt)))
        );
        a.eta = uint48(abi.decode(getTs, (uint256)));
        emit ActionScheduled(id, a.eta);
    }

    /// @notice Ejecutar la acción programada cuando el timelock permita.
    function executeViaTimelock(bytes32 id, bytes32 predecessor, bytes32 salt) external {
        Action storage a = actions[id];
        if (a.target == address(0) || a.executed) revert Errors.InvalidState();
        (bool ok,) = emergencyTimelock.call(
            abi.encodeWithSignature("execute(address,uint256,bytes,bytes32,bytes32)", a.target, 0, a.data, predecessor, salt)
        );
        require(ok, "execute failed");
        a.executed = true;
        emit ActionExecuted(id);
    }

    // View helpers
    function targets() external view returns (address[] memory) { return _targets.values(); }
}

