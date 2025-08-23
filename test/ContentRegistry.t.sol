
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/N121_DIDRegistryStub.sol";
import "../contracts/ContentRegistry.sol";

contract ContentRegistryTest is Test {
    N121_DIDRegistryStub did;
    ContentRegistry reg;
    address alice = address(0xA11CE);

    function setUp() public {
        did = new N121_DIDRegistryStub();
        reg = new ContentRegistry(address(did));
        vm.prank(did.owner());
        did.setDID(alice, "did:pkh:eip155:1:0xA11CE0000000000000000000000000000000000");
    }

    function testRegisterAndRead() public {
        bytes32 h = keccak256("hola-gnew");
        vm.prank(alice);
        reg.registerRecord(
            h,
            "bafybeigdyrztxexamplecid",
            "ArweaveTxIdExample",
            "did:pkh:eip155:1:0xA11CE0000000000000000000000000000000000"
        );

        (bytes32 ch, string memory cid, string memory ar, , address sub, uint256 ts) = reg.getRecord(h);
        assertEq(ch, h);
        assertEq(cid, "bafybeigdyrztxexamplecid");
        assertEq(ar, "ArweaveTxIdExample");
        assertEq(sub, alice);
        assertGt(ts, 0);
        assertTrue(reg.isRegistered(h));
    }

    function testRevertAlreadyRegistered() public {
        bytes32 h = keccak256("x");
        vm.prank(alice);
        reg.registerRecord(h, "cid", "ar", "did:pkh:eip155:1:0xA11CE0000000000000000000000000000000000");
        vm.prank(alice);
        vm.expectRevert(ContentRegistry.AlreadyRegistered.selector);
        reg.registerRecord(h, "cid2", "ar2", "did:pkh:eip155:1:0xA11CE0000000000000000000000000000000000");
    }

    function testRevertInvalidDID() public {
        bytes32 h = keccak256("y");
        vm.prank(alice);
        vm.expectRevert(ContentRegistry.InvalidDID.selector);
        reg.registerRecord(h, "cid", "ar", "did:pkh:eip155:1:0xWRONG");
    }
}


