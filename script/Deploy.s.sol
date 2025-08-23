
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/N121_DIDRegistryStub.sol";
import "../contracts/ContentRegistry.sol";

contract DeployM1 is Script {
    function run() external {
        vm.startBroadcast();

        // Despliegue del stub N121 (reemplazar por dirección real en entornos productivos)
        N121_DIDRegistryStub did = new N121_DIDRegistryStub();

        // Despliegue del ContentRegistry con referencia a N121
        ContentRegistry reg = new ContentRegistry(address(did));

        console2.log("N121_DIDRegistryStub:", address(did));
        console2.log("ContentRegistry:", address(reg));

        vm.stopBroadcast();
    }
}


