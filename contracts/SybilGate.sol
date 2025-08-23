
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SybilGate
/// @notice Contrato que consulta un oráculo de sybil-score para gates de votación/grants
interface ISybilOracle {
    function getScore(address user) external view returns (uint256);
}

contract SybilGate {
    ISybilOracle public oracle;
    uint256 public threshold;

    constructor(address _oracle, uint256 _threshold) {
        oracle = ISybilOracle(_oracle);
        threshold = _threshold;
    }

    function eligible(address user) external view returns (bool) {
        return oracle.getScore(user) >= threshold;
    }
}


