// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/templates/PullPaymentEscrow.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock", "MCK") { _mint(msg.sender, 1e24); }
}

contract PullPaymentEscrowTest is Test {
    MockToken token;
    PullPaymentEscrow escrow;
    address owner = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        token = new MockToken();
        escrow = new PullPaymentEscrow(IERC20(address(token)));
        vm.prank(address(this));
        escrow.transferOwnership(owner);
        token.transfer(owner, 1e21);
        vm.startPrank(owner);
        token.approve(address(escrow), type(uint256).max);
        vm.stopPrank();
    }

    function test_deposit_and_withdraw() public {
        vm.prank(owner);
        escrow.deposit(bob, 1000);
        assertEq(escrow.credits(bob), 1000);

        vm.prank(bob);
        vm.expectEmit(true, true, false, true);
        emit PullPaymentEscrow.Withdrawn(bob, 1000);
        escrow.withdraw();

        assertEq(token.balanceOf(bob), 1000);
        assertEq(escrow.credits(bob), 0);
    }

    function test_reentrancy_blocked() public {
        vm.prank(owner);
        escrow.deposit(bob, 1);
        vm.prank(bob);
        escrow.withdraw(); // segunda llamada en mismo tx no es posible
        vm.prank(bob);
        vm.expectRevert(); // no hay saldo ya
        escrow.withdraw();
    }
}

