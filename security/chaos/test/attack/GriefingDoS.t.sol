// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/attacks/GriefingReceiver.sol";
import "../../src/victims/VulnerableVault.sol";

contract GriefingDoSTest is Test {
    VulnerableVault vault;
    GriefingReceiver griefer;

    function setUp() public {
        vault = new VulnerableVault();
        griefer = new GriefingReceiver();
        vm.deal(address(this), 10 ether);
        (bool ok,) = address(vault).call{value: 5 ether}("");
        require(ok);
    }

    function test_push_payment_fails_on_griefing() public {
        // deposit a nombre del griefer
        vm.prank(address(griefer));
        vault.deposit{value: 1 ether}();
        // Cuando intenta retirar, el receive() revierte → DoS (pago push)
        vm.prank(address(griefer));
        vm.expectRevert();
        vault.withdraw();
    }
}

