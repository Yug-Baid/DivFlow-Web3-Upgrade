// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/LandRegistry.sol";
import "../src/Properties.sol";
import "../src/TransferOfOwnership.sol";
import "../src/Users.sol";

contract FullFlowTest is Test {
    LandRegistry landRegistry;
    TransferOwnerShip transferOwnership;
    Users usersContract;

    address admin = address(1);
    address landInspector = address(5);
    address revenueEmployee = address(2);
    address seller = address(3);
    address buyer = address(4);

    function setUp() public {
        vm.startPrank(admin);
        usersContract = new Users();
        landRegistry = new LandRegistry();
        transferOwnership = new TransferOwnerShip(address(landRegistry));
        
        // Setup Land Inspector for location 1
        landRegistry.assignLandInspector(1, landInspector);
        
        // Setup Revenue Dept Employee for dept 100
        landRegistry.mapRevenueDeptIdToEmployee(100, revenueEmployee);
        vm.stopPrank();
    }

    function testFullSaleFlow() public {
        // 1. Register Users (using hashed identity for privacy)
        vm.prank(seller);
        bytes32 sellerIdentity = keccak256(abi.encodePacked("Seller", "User", "ABCDE1234F", "123456789012"));
        bytes32 sellerAadhar = keccak256(abi.encodePacked("123456789012"));
        bytes32 sellerPan = keccak256(abi.encodePacked("ABCDE1234F"));
        usersContract.registerUser(sellerIdentity, sellerAadhar, sellerPan, "QmSellerProfile");
        
        vm.prank(buyer);
        bytes32 buyerIdentity = keccak256(abi.encodePacked("Buyer", "User", "FGHIJ5678K", "987654321098"));
        bytes32 buyerAadhar = keccak256(abi.encodePacked("987654321098"));
        bytes32 buyerPan = keccak256(abi.encodePacked("FGHIJ5678K"));
        usersContract.registerUser(buyerIdentity, buyerAadhar, buyerPan, "QmBuyerProfile");

        // 2. Register Land (Seller) - now with landType parameter (0 = WithPapers)
        vm.prank(seller);
        uint256 propertyId = landRegistry.addLand(1, 100, 50, 1000, "QmHash", 0);
        
        // 3. Land Inspector verifies property registration
        vm.prank(landInspector);
        landRegistry.verifyPropertyByInspector(propertyId);
        
        // Check state is Verified (2)
        Property.Land memory land = landRegistry.getPropertyDetails(propertyId);
        assertEq(uint(land.state), 2); // Verified
        assertEq(land.landType, 0); // WithPapers

        // 4. List on Marketplace (Seller)
        vm.prank(seller);
        transferOwnership.addPropertyOnSale(propertyId, 1 ether); // 1 ETH

        // Check Sales
        TransferOwnerShip.Sales[] memory allSales = transferOwnership.getAllSales();
        assertEq(allSales.length, 1);
        uint256 saleId = allSales[0].saleId;

        // 5. Send Purchase Request (Buyer)
        vm.prank(buyer);
        transferOwnership.sendPurchaseRequest(saleId, 1 ether);

        // CHECK: getRequestedSales (Buyer side)
        TransferOwnerShip.Sales[] memory buyerRequests = transferOwnership.getRequestedSales(buyer);
        assertEq(buyerRequests.length, 1);
        assertEq(buyerRequests[0].saleId, saleId);

        // CHECK: getRequestedUsers (Seller side)
        TransferOwnerShip.RequestedUser[] memory requests = transferOwnership.getRequestedUsers(saleId);
        assertEq(requests.length, 1);
        assertEq(requests[0].user, buyer);
        assertEq(requests[0].priceOffered, 1 ether);

        // 6. Accept Request (Seller)
        vm.prank(seller);
        transferOwnership.acceptBuyerRequest(saleId, buyer, 1 ether);

        // Check status updated
        TransferOwnerShip.Sales[] memory updatedSales = transferOwnership.getAllSales();
        assertEq(uint(updatedSales[0].state), 1); // AcceptedToABuyer

        // 7. Transfer Ownership / Pay (Buyer)
        vm.deal(buyer, 2 ether);
        vm.prank(buyer);
        transferOwnership.transferOwnerShip{value: 1 ether}(saleId);

        // Check ownership transferred
        Property.Land memory soldLand = landRegistry.getPropertyDetails(propertyId);
        assertEq(soldLand.owner, buyer);
        assertEq(uint(soldLand.state), 5); // Bought
    }
}

