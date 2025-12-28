// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Users.sol";
import "../src/LandRegistry.sol";
import "../src/TransferOfOwnership.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        Users users = new Users();
        console.log("Users deployed at:", address(users));

        LandRegistry landRegistry = new LandRegistry();
        console.log("LandRegistry deployed at:", address(landRegistry));

        TransferOwnerShip transferOwnership = new TransferOwnerShip(address(landRegistry));
        console.log("TransferOwnerShip deployed at:", address(transferOwnership));

        // Output for frontend use
        console.log("--------------------------------------------------");
        console.log("Copy these addresses to frontend/src/lib/contracts.ts");
        console.log("USERS_ADDRESS:", address(users));
        console.log("LAND_REGISTRY_ADDRESS:", address(landRegistry));
        console.log("TRANSFER_OWNERSHIP_ADDRESS:", address(transferOwnership));
        console.log("--------------------------------------------------");

        vm.stopBroadcast();
    }
}
