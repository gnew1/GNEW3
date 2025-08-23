// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Oráculo ingenuo (vulnerable a manipulación externa).
interface IPriceOracle {
    function price() external view returns (uint256); // tokens per 1 ETH scaled 1e18
}

/// @notice Víctima: vende/minta tokens según precio on-chain sin salvaguardas (no TWAP, no caps).
interface IERC20Mint {
    function mint(address to, uint256 amount) external;
}

contract OracleVictimAmm {
    IPriceOracle public immutable oracle;
    IERC20Mint public immutable token;

    constructor(IPriceOracle _oracle, IERC20Mint _token) {
        oracle = _oracle;
        token = _token;
    }

    /// @dev El comprador envía ETH y recibe tokens = ETH * price (sin límites!)
    function buy() external payable {
        require(msg.value > 0, "no eth");
        uint256 tokensOut = (msg.value * oracle.price()) / 1e18;
        token.mint(msg.sender, tokensOut);
    }
}

/// @notice Mock oráculo controlable (simula keeper comprometido).
contract MockOracle is IPriceOracle {
    uint256 public p;
    function set(uint256 _p) external { p = _p; }
    function price() external view returns (uint256) { return p; }
}

