// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/templates/SafeERC20Vault.sol";

contract MockAsset is ERC20 {
    constructor() ERC20("Asset", "AST") { _mint(msg.sender, 1e24); }
}

contract SafeERC20VaultTest is Test {
    MockAsset asset;
    SafeERC20Vault vault;
    address owner = address(0xA11CE);
    address user = address(0xB0B);

    function setUp() public {
        asset = new MockAsset();
        vault = new SafeERC20Vault(IERC20(address(asset)), 1e20);
        vault.transferOwnership(owner);
        asset.transfer(user, 1e21);
        vm.prank(owner);
        vault.setAllowed(user, true);
    }

    function test_pull_push_flow() public {
        vm.startPrank(user);
        asset.approve(address(vault), 5e18);
        vm.stopPrank();

        vm.prank(user);
        vault.pull(user, 5e18);
        assertEq(asset.balanceOf(address(vault)), 5e18);

        vm.prank(owner);
        vault.push(user, 2e18);
        assertEq(asset.balanceOf(user), 1e21 - 5e18 + 2e18);
    }

    function test_pause_blocks_ops() public {
        vm.prank(owner);
        vault.pause();
        vm.prank(user);
        vm.expectRevert();
        vault.pull(user, 1);
    }
}

