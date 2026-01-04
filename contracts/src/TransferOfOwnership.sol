// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Properties.sol";
import "./LandRegistry.sol";

contract TransferOwnerShip {
    // ######################################################################
    //              TRANSFER OWNERSHIP OF PROPERTY
    // ######################################################################

    Property private propertiesContract;
    LandRegistry private LandRegistryContract;

    constructor(address _landRegistryContractAddress) {
        // Creating Land Registry Object
        LandRegistryContract = LandRegistry(_landRegistryContractAddress);

        address propertiesContractAddress = LandRegistryContract.getPropertiesContract();
        propertiesContract = Property(propertiesContractAddress);

        LandRegistryContract.setTransferOwnershipContractAddress(address(this));
    }

    // ******** Enumerators ************

    enum SaleState {
        Active,
        AcceptedToABuyer,
        CancelSaleBySeller,
        Success,
        DeadlineOverForPayment,
        CancelAcceptanceRequestGivenBySeller,
        RejectedAcceptanceRequestByBuyer
    }

    enum RequestedUserToASaleState {
        SentPurchaseRequest,
        CancelPurchaseRequest,
        SellerAcceptedPurchaseRequest,
        SellerRejectedPurchaseRequest,
        SellerCanceledAcceptanceRequest,
        YouRejectedAcceptanceRequest,
        ReRequestedPurchaseRequest,
        SuccessfullyTransfered
    }

    // ****************** Structures ********************

    struct RequestedUser {
        address user;
        uint256 priceOffered;
        RequestedUserToASaleState state;
    }

    struct Sales {
        uint256 saleId;
        address owner;
        uint256 price;
        uint256 propertyId;
        address acceptedFor;
        uint256 acceptedPrice;
        uint256 acceptedTime;
        uint256 deadlineForPayment;
        bool paymentDone;
        SaleState state;
    }

    // *******  Public variables *********
    Sales[] private sales;

    // *********** MAPPINGS  *************

    // mapping of address and their properties which are on sale to sell.
    mapping(address => uint256[]) private salesOfOwner;

    // mapping of address and their requested properties to purchase
    mapping(address => uint256[]) public requestedSales;

    // mapping of sale id to requested user details
    mapping(uint256 => RequestedUser[]) requestedUsers;

    // mapping of location to the sale id available to purchase
    mapping(uint256 => uint256[]) private propertiesOnSaleByLocation;

    // ********** EVENTS     *************
    event PropertyOnSale(address indexed owner, uint256 indexed propertyId, uint256 saleId);

    event PurchaseRequestSent(
        uint256 saleId,
        address requestedUser,
        uint256 priceOffered
    );

    event SaleAccepted(
        uint256 saleId,
        address buyer,
        uint256 price,
        uint256 deadline
    );

    // ************ FUNCTIONS ************

    // Conversion function from Ether to Wei
    function convertToWei(uint256 etherValue) public pure returns (uint256) {
        return etherValue * 1 ether;
    }

    // add Property on Sale - FIX: Now goes to SalePending, not directly to OnSale
    function addPropertyOnSale(uint256 _propertyId, uint256 _price) public {
        require(
            msg.sender == propertiesContract.getLandDetailsAsStruct(_propertyId).owner,
            "Only the owner can put the property on sale."
        );

        // SECURITY: Check if the property is verified before allowing sale request
        Property.StateOfProperty currentState = propertiesContract.getLandDetailsAsStruct(_propertyId).state;
        require(
            currentState == Property.StateOfProperty.Verified || 
            currentState == Property.StateOfProperty.Bought,
            "Property must be Verified or previously Bought before listing for sale"
        );

        // add property id to list of properties that are available to sold on a loaction
        uint256[] storage propertiesOnSale = propertiesOnSaleByLocation[
            propertiesContract.getLandDetailsAsStruct(_propertyId).locationId
        ];

        propertiesOnSale.push(sales.length);

        Sales memory newSale = Sales({
            saleId: sales.length,
            owner: msg.sender,
            price: _price,
            propertyId: _propertyId,
            acceptedFor: address(0),
            acceptedPrice: 0,
            acceptedTime: 0,
            deadlineForPayment: 0,
            paymentDone: false,
            state: SaleState.Active
        });

        sales.push(newSale);

        // add sale to the owner's sales array
        salesOfOwner[msg.sender].push(newSale.saleId);

        // FIX: Change to SalePending - Revenue Employee must approve before marketplace
        propertiesContract.changeStateToSalePending(_propertyId, _price, msg.sender);

        emit PropertyOnSale(msg.sender, _propertyId, newSale.saleId);
    }
// ...
    function getRequestedUsers(uint256 saleId) public view returns (RequestedUser[] memory) {
        return requestedUsers[saleId];
    }

    function getRequestedSales(address _user) public view returns (Sales[] memory) {
        uint256[] memory requestSaleIds = requestedSales[_user];
        Sales[] memory requests = new Sales[](requestSaleIds.length);

        for (uint256 i = 0; i < requestSaleIds.length; i++) {
            requests[i] = sales[requestSaleIds[i]];
        }

        return requests;
    }

    // send purchase request to seller  to buy a land from buyer
    function sendPurchaseRequest(uint256 _saleId, uint256 _priceOffered) public {
        // Get the sales details
        Sales storage sale = sales[_saleId];

        // Make sure the sale exists
        require(sale.propertyId != 0, "Sale does not exist");

        // Make Sure that Sale is not accepted
        require(sale.state == SaleState.Active, "Property Not in Active State to Purchase");

        // Add the request to the requested users array of sale
        requestedUsers[sale.saleId].push(
            RequestedUser({
                user: msg.sender,
                priceOffered: _priceOffered,
                state: RequestedUserToASaleState.SentPurchaseRequest
            })
        );

        // add sale id to myrequested sales
        requestedSales[msg.sender].push(sale.saleId);

        // Emit an event
        emit PurchaseRequestSent(_saleId, msg.sender, _priceOffered);
    }

    function getAllSales() public view returns (Sales[] memory) {
        return sales;
    }

    // function to accept buyer request
    function acceptBuyerRequest(
        uint256 _saleId,
        address _buyer,
        uint256 _price
    ) public {
        // Find the sale object by its ID
        Sales storage sale = sales[_saleId];

        // Make sure the sale exists
        require(sale.propertyId != 0, "Sale does not exist");

        // Make sure the sale exists
        require(sale.state == SaleState.Active, "Sale is Not Active");

        // Only owner of property can be allowed
        require(
            msg.sender == propertiesContract.getLandDetailsAsStruct(sale.propertyId).owner,
            "Only the owner can accept the purchase request."
        );

        // Make sure the buyer has made a request and the price is greater than or equal to the owner's set price
        require(requestedUsers[sale.saleId].length > 0, "No buyer requests found");

        // CRITICAL FIX: Find buyer entry that matches BOTH address AND price
        // This allows accepting any specific offer from a buyer who made multiple bids
        bool buyerFound = false;
        uint256 i = 0;
        for (i = 0; i < requestedUsers[sale.saleId].length; i++) {
            // Match BOTH buyer address AND exact price
            if (requestedUsers[sale.saleId][i].user == _buyer && 
                requestedUsers[sale.saleId][i].priceOffered == _price) {
                buyerFound = true;
                break;
            }
        }
        require(buyerFound, "No matching request found for this buyer and price");

        // Update the sale object with buyer information
        sale.acceptedFor = _buyer;
        sale.acceptedPrice = _price;
        sale.acceptedTime = block.timestamp;
        sale.deadlineForPayment = block.timestamp + 1 hours; // Extended for demo - 1 hour instead of 5 minutes

        sale.state = SaleState.AcceptedToABuyer;

        // Update the state of requested buyer
        requestedUsers[sale.saleId][i].state = RequestedUserToASaleState
            .SellerAcceptedPurchaseRequest;

        emit SaleAccepted(_saleId, _buyer, _price, sale.deadlineForPayment);
    }
// ...
    // function to re-request purchase request
    function rerequestPurchaseRequest(uint256 _saleId, uint256 _priceOffered) public {
        // Get the sales details
        Sales storage sale = sales[_saleId];

        // Make sure the sale exists
        require(sale.propertyId != 0, "Sale does not exist");

        // Make sure that sale is active state
        require(sale.state == SaleState.Active, "Sale is Not Active");

        // Gettin index value of buyer in
        // requestedUsers of a sale to purchase.
        bool buyerFound = false;
        uint256 i = 0;
        for (i = 0; i < requestedUsers[sale.saleId].length; i++) {
            if (requestedUsers[sale.saleId][i].user == msg.sender) {
                buyerFound = true;
                break;
            }
        }

        // checking existed buyer or not
        require(buyerFound, "Buyer Not found in Requested List");

        // allowed states
        require(
            requestedUsers[sale.saleId][i].state !=
                RequestedUserToASaleState.SentPurchaseRequest,
            "State Not Allowed to Re-sent Purchase Request"
        );
        require(
            requestedUsers[sale.saleId][i].state !=
                RequestedUserToASaleState.SellerAcceptedPurchaseRequest,
            "State Not Allowed to Re-sent Purchase Request"
        );
        require(
            requestedUsers[sale.saleId][i].state !=
                RequestedUserToASaleState.ReRequestedPurchaseRequest,
            "State Not Allowed to Re-sent Purchase Request"
        );

        // Reset Buyer in RequesteUsers of a Sale.
        requestedUsers[sale.saleId][i].state = RequestedUserToASaleState
            .ReRequestedPurchaseRequest;
        requestedUsers[sale.saleId][i].priceOffered = _priceOffered;

        // Emit an event
        emit PurchaseRequestSent(_saleId, msg.sender, _priceOffered);
    }

    // function to transfer owner ship
    function transferOwnerShip(uint256 saleId) public payable {
        Sales storage sale = sales[saleId];

        require(msg.sender == sale.acceptedFor, "Only accepted buyer can complete the sale");

        require(msg.value == sale.acceptedPrice, "Payment amount must be equal to accepted price");

        require(block.timestamp <= sale.deadlineForPayment, "Payment deadline has passed");

        // Find buyer entry matching BOTH address AND accepted price
        // This is needed when buyer has multiple bids on the same sale
        bool buyerFound = false;
        uint256 i = 0;
        for (i = 0; i < requestedUsers[sale.saleId].length; i++) {
            if (requestedUsers[sale.saleId][i].user == msg.sender &&
                requestedUsers[sale.saleId][i].priceOffered == sale.acceptedPrice) {
                buyerFound = true;
                break;
            }
        }

        // checking existed buyer or not
        require(buyerFound, "Buyer Not found in Requested List");

        // transfer payment to property owner
        payable(sale.owner).transfer(msg.value);

        // transfer ownership of property to buyer
        LandRegistryContract.transferOwnership(sale.propertyId, msg.sender);

        // chaging state of Requested user to successfully transformed
        requestedUsers[sale.saleId][i].state = RequestedUserToASaleState.SuccessfullyTransfered;

        // Remove sale from availabel sales by location

        uint256 _location = propertiesContract
            .getLandDetailsAsStruct(sale.propertyId)
            .locationId;

        uint256[] storage propertiesOnSale = propertiesOnSaleByLocation[_location];

        for (i = 0; i < propertiesOnSale.length; i++) {
            if (propertiesOnSale[i] == sale.saleId) {
                propertiesOnSale[i] = propertiesOnSale[propertiesOnSale.length - 1];
                propertiesOnSale.pop();
                break;
            }
        }

        sale.state = SaleState.Success;

        // // remove sale from buyer's requested sales
        // delete requestedSales[msg.sender][saleId];

        // // emit event
        // emit SaleCompleted(saleId, msg.sender, sale.acceptedPrice);
    }
}
