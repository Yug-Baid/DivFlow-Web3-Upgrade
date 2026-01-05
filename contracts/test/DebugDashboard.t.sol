// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/LandRegistry.sol";
import "../src/Properties.sol";

contract DebugDashboard is Test {
    LandRegistry landRegistry;

    function setUp() public {
        landRegistry = new LandRegistry();
    }

    function testAddAndGetLand() public {
        uint256 locationId = 101;
        uint256 revenueDeptId = 202;
        uint256 surveyNumber = 303;
        uint256 area = 1000;
        string memory ipfsHash = "QmTest";

        address owner = address(0x123);
        vm.prank(owner);
        landRegistry.addLand(locationId, revenueDeptId, surveyNumber, area, ipfsHash, 0);

        vm.prank(owner);
        Property.Land[] memory properties = landRegistry.getPropertiesOfOwner(owner);

        assertEq(properties.length, 1);
        assertEq(properties[0].locationId, locationId);
        assertEq(properties[0].owner, owner);
        console.log("Property ID:", properties[0].propertyId);
        console.log("IPFS Hash:", properties[0].ipfsHash);
    }
}
