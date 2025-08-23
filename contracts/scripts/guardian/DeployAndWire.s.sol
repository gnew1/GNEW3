// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/guardian/EmergencyTimelock.sol";
import "../../src/guardian/GuardianCouncil.sol";

contract DeployAndWire is Script {
    function run() external {
        address dao = vm.envAddress("DAO_ADDRESS");
        address[] memory guardians = vm.envAddress("GUARDIANS", ","); // custom env parsing: comma-separated
        uint256 quorum = vm.envUint("GUARDIAN_QUORUM");
        uint256 minDelay = vm.envUint("EMERGENCY_DELAY"); // seconds

        vm.startBroadcast();
        address; proposers[0] = address(0); // set later
        address; executors[0] = address(0);
        EmergencyTimelock tl = new EmergencyTimelock(minDelay, proposers, executors, dao);
        GuardianCouncil council = new GuardianCouncil(address(tl), dao, guardians, quorum);
        tl.grantRole(tl.PROPOSER_ROLE(), address(council));
        console2.log("EmergencyTimelock:", address(tl));
        console2.log("GuardianCouncil:", address(council));
        vm.stopBroadcast();
    }
}

