// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/attacks/OracleAttackHarness.sol";
import "../../src/mocks/MockToken.sol";

contract OracleManipulationTest is Test {
    MockOracle oracle;
    OracleVictimAmm victim;
    MockToken token;

    function setUp() public {
        oracle = new MockOracle();
        token = new MockToken();
        victim = new OracleVictimAmm(IPriceOracle(address(oracle)), IERC20Mint(address(token)));
        vm.deal(address(this), 100 ether);
    }

    function test_price_oracle_manipulation_mints_excess_tokens() public {
        // Keeper comprometido sube el precio x100
        oracle.set(100e18); // 100 tokens por 1 ETH
        victim.buy{value: 1 ether}();
        uint256 balHigh = token.balanceOf(address(this));
        // Mitigación esperada: cap al delta, TWAP, o pausa por desvío → aquí no existe
        assertEq(balHigh, 100e18, "excess mint due to oracle spike");
    }
}

