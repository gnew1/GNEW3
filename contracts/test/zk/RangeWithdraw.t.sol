// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/zk/RangeWithdraw.sol";
import "../../src/zk/verifiers/MockGroth16Verifier.sol";

contract RangeWithdrawTest is Test {
    MockGroth16Verifier mock;
    RangeWithdraw rw;
    address user = address(0xBEEF);

    function setUp() public {
        mock = new MockGroth16Verifier(true);
        rw = new RangeWithdraw(mock);
        vm.deal(address(rw), 100 ether);
    }

    function test_withdraw_success() public {
        uint[2] memory a; uint[2][2] memory b; uint[2] memory c;
        uint;
        sig[0] = 0xC0FFEE; // commitment
        sig[1] = 1 ether;  // amount
        uint256 balBefore = user.balance;
        rw.withdraw(a, b, c, sig, user);
        assertEq(user.balance, balBefore + 1 ether);
        assertTrue(rw.spentCommitment(bytes32(uint256(0xC0FFEE))));
    }

    function test_reject_double_spend() public {
        uint[2] memory a; uint[2][2] memory b; uint[2] memory c;
        uint;
        sig[0] = 111; sig[1] = 1;
        rw.withdraw(a, b, c, sig, user);
        vm.expectRevert();
        rw.withdraw(a, b, c, sig, user);
    }
}

