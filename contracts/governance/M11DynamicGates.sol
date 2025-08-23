
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * M11: Gobernanza Autónoma con Gates Dinámicos
 * Contrato que implementa filtros dinámicos de participación en votaciones,
 * permitiendo habilitar o deshabilitar gates basados en reglas (tokens, DID, reputación).
 */

interface IGate {
    function isEligible(address user) external view returns (bool);
}

contract ReputationGate is IGate {
    mapping(address => uint256) public reputation;

    function setReputation(address user, uint256 score) external {
        reputation[user] = score;
    }

    function isEligible(address user) external view override returns (bool) {
        return reputation[user] >= 100;
    }
}

contract TokenBalanceGate is IGate {
    IERC20 public token;
    uint256 public minBalance;

    constructor(address _token, uint256 _minBalance) {
        token = IERC20(_token);
        minBalance = _minBalance;
    }

    function isEligible(address user) external view override returns (bool) {
        return token.balanceOf(user) >= minBalance;
    }
}

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
}

contract DynamicGovernance {
    IGate[] public gates;

    event GateAdded(address indexed gate);
    event GateRemoved(address indexed gate);

    function addGate(address gate) external {
        gates.push(IGate(gate));
        emit GateAdded(gate);
    }

    function removeGate(uint256 index) external {
        address removed = address(gates[index]);
        gates[index] = gates[gates.length - 1];
        gates.pop();
        emit GateRemoved(removed);
    }

    function canVote(address user) public view returns (bool) {
        for (uint i = 0; i < gates.length; i++) {
            if (!gates[i].isEligible(user)) {
                return false;
            }
        }
        return true;
    }
}


