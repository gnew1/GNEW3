// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@gnew/contracts/templates/PullPaymentEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Handler {
    PullPaymentEscrow escrow;
    ERC20Mock token;

    address owner;
    address user1;
    address user2;

    constructor(PullPaymentEscrow _escrow, ERC20Mock _token, address _owner) {
        escrow = _escrow;
        token = _token;
        owner = _owner;
        user1 = address(0xBEEF1);
        user2 = address(0xBEEF2);
    }

    function depositU1(uint256 amount) external {
        amount = bound(amount, 1e6, 1e21);
        vm.startPrank(owner);
        token.approve(address(escrow), amount);
        escrow.deposit(user1, amount);
        vm.stopPrank();
    }

    function depositU2(uint256 amount) external {
        amount = bound(amount, 1e6, 1e21);
        vm.startPrank(owner);
        token.approve(address(escrow), amount);
        escrow.deposit(user2, amount);
        vm.stopPrank();
    }

    function withdrawU1() external {
        vm.prank(user1);
        try escrow.withdraw() {} catch {}
    }

    function withdrawU2() external {
        vm.prank(user2);
        try escrow.withdraw() {} catch {}
    }

    function pause() external {
        vm.prank(owner);
        try escrow.pause() {} catch {}
    }

    function unpause() external {
        vm.prank(owner);
        try escrow.unpause() {} catch {}
    }
}

contract ERC20Mock is ERC20 {
    constructor() ERC20("Mock","MCK") { _mint(msg.sender, 10_000_000 ether); }
}

contract InvariantsEscrow is Test {
    PullPaymentEscrow escrow;
    ERC20Mock token;
    Handler handler;

    function setUp() public {
        token = new ERC20Mock();
        escrow = new PullPaymentEscrow(IERC20(address(token)));
        escrow.transferOwnership(address(this));
        handler = new Handler(escrow, token, address(this));

        // seed
        token.transfer(address(this), 9_000_000 ether);

        // target fuzz
        bytes4;
        selectors[0] = handler.depositU1.selector;
        selectors[1] = handler.depositU2.selector;
        selectors[2] = handler.withdrawU1.selector;
        selectors[3] = handler.withdrawU2.selector;
        selectors[4] = handler.pause.selector;
        selectors[5] = handler.unpause.selector;

        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
        targetContract(address(handler));
    }

    /// Invariante: suma de créditos ≥ 0 y <= balance del escrow (post-withdraw)
    function invariant_credits_le_balance() public {
        uint256 totalCredits = escrow.credits(address(0xBEEF1)) + escrow.credits(address(0xBEEF2));
        assertLe(totalCredits, IERC20(address(token)).balanceOf(address(escrow)));
    }
}

