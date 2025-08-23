// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../src/guardian/GuardianCouncil.sol";
import "../../src/guardian/EmergencyTimelock.sol";
import "../../src/guardian/ProtectableVault.sol";
import "../../src/guardian/RescueVault.sol";
import "../../src/guardian/RefundManagerMerkle.sol";
import "../../src/guardian/DenylistSimple.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock", "MCK") { _mint(msg.sender, 1e24); }
}

contract GuardianFlowTest is Test {
    address dao = address(0xD00D);
    address g1 = address(0xG1);
    address g2 = address(0xG2);
    address g3 = address(0xG3);

    EmergencyTimelock timelock;
    GuardianCouncil council;
    ProtectableVault vault;
    RescueVault rv;
    MockToken token;
    RefundManagerMerkle refund;
    DenylistSimple deny;

    function setUp() public {
        vm.startPrank(dao);
        address; proposers[0] = address(this); // provisional
        address; executors[0] = address(0);
        timelock = new EmergencyTimelock(1 minutes, proposers, executors, dao);
        vm.stopPrank();

        // Reemplazar proposers por el council luego
        token = new MockToken();
        vault = new ProtectableVault(address(timelock));
        rv = new RescueVault();
        deny = new DenylistSimple();
        vm.deal(address(vault), 10 ether);

        // Seed: token al vault
        token.transfer(address(vault), 1e21);

        // Deploy council con guardians [g1,g2,g3], quorum 2
        address; gs[0]=g1; gs[1]=g2; gs[2]=g3;
        council = new GuardianCouncil(address(timelock), dao, gs, 2);

        // DAO da rol proposer al council
        vm.prank(dao);
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(council));

        // Registrar targets válidos
        address; t[0]=address(vault);
        vm.prank(dao);
        council.addTargets(t);

        // Refund manager
        refund = new RefundManagerMerkle(IERC20(address(token)), bytes32(0));
        refund.transferOwnership(dao);
        rv.transferOwnership(dao);
        vault.transferOwnership(dao);
    }

    function test_emergency_flow_pause_and_sweep_and_refund() public {
        // 1) Dos guardianes pausan rápido
        vm.prank(g1); council.fastPause(address(vault), keccak256("incident:xyz"));
        vm.prank(g2); council.fastPause(address(vault), keccak256("incident:xyz"));
        assertTrue(vault.paused(), "vault paused");

        // 2) Guardianes proponen y aprueban acción de barrido al RescueVault vía timelock
        //    Data: vault.emergencySweep(token, rv, amount)
        bytes memory data = abi.encodeWithSignature("emergencySweep(address,address,uint256)", address(token), address(rv), 5e20);
        bytes32 id = council.proposeAction(address(vault), data, keccak256("sweep-tokens"));
        vm.prank(g2); council.approve(id);

        // 3) Programar y ejecutar (tras minDelay)
        vm.prank(g1); council.scheduleViaTimelock(id, bytes32(0), keccak256("salt"));
        skip(61); // avanza tiempo > 1 minuto
        council.executeViaTimelock(id, bytes32(0), keccak256("salt"));
        assertEq(token.balanceOf(address(rv)), 5e20, "rescued to RV");

        // 4) DAO fija Merkle root y hace refunds
        bytes32 leaf = keccak256(abi.encode(address(0xBEEF), uint256(5e20)));
        // simple root = leaf (un solo beneficiario)
        vm.prank(dao); refund.setRoot(leaf);
        // Approve desde RV -> RefundManager
        vm.startPrank(dao);
        // simula que RV envía fondos al RefundManager para distribuir
        token.transfer(address(refund), 5e20);
        vm.stopPrank();

        bytes32;
        vm.prank(address(0xBEEF));
        refund.refund(address(0xBEEF), 5e20, proof);
        assertEq(token.balanceOf(address(0xBEEF)), 5e20, "victim refunded");
    }
}

