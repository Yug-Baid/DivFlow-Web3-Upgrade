// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Property {
    // Property states in the verification workflow:
    // Created    : Initial state when property is submitted by user
    // Scheduled  : (Reserved for future scheduling feature)
    // Verified   : Land Inspector approved the registration
    // Rejected   : Land Inspector rejected the registration
    // OnSale     : Revenue Employee approved the sale, listed on marketplace
    // Bought     : Property has been sold to new owner
    // SalePending: Owner requested to sell, waiting for Revenue Employee approval
    enum StateOfProperty {
        Created,      // 0
        Scheduled,    // 1
        Verified,     // 2
        Rejected,     // 3
        OnSale,       // 4
        Bought,       // 5
        SalePending   // 6 - NEW: Waiting for Revenue Employee to approve sale
    }

    // Land types
    // WithPapers    : Existing registered land with government documents
    // WithoutPapers : Unregistered land (forest, wasteland) being registered fresh
    enum LandType {
        WithPapers,    // 0
        WithoutPapers  // 1
    }

    struct Land {
        uint256 propertyId;
        uint256 locationId;
        uint256 revenueDepartmentId;
        uint256 surveyNumber;
        address owner;
        uint256 area;
        uint256 price;
        uint256 registeredTime;
        address employeeId;        // Inspector/Employee who verified
        string scheduledDate;
        string rejectedReason;
        string ipfsHash;
        StateOfProperty state;
        uint8 landType;            // 0 = WithPapers, 1 = WithoutPapers
    }

    // property Id => property
    mapping(uint256 => Land) public lands;

    // Used to generate property id
    uint256 private landCount;

    // SECURITY: Access control - only authorized contracts can modify state
    address private landRegistryAddress;
    address private transferOwnershipAddress;
    
    constructor() {
        // Auto-authorize the deployer (LandRegistry contract) 
        landRegistryAddress = msg.sender;
    }
    
    // Set TransferOwnership address (can only be called by LandRegistry, once)
    function setTransferOwnershipAddress(address _addr) external {
        require(msg.sender == landRegistryAddress, "Only LandRegistry");
        require(transferOwnershipAddress == address(0), "Already set");
        transferOwnershipAddress = _addr;
    }
    
    modifier onlyAuthorized() {
        require(
            msg.sender == landRegistryAddress || msg.sender == transferOwnershipAddress,
            "Unauthorized: Only LandRegistry or TransferOwnership contracts allowed"
        );
        _;
    }

    // ============ LAND MANAGEMENT ============

    function addLand(
        uint256 _locationId,
        uint256 _revenueDepartmentId,
        uint256 _surveyNumber,
        address _owner,
        uint256 _area,
        string memory _ipfsHash,
        uint8 _landType
    ) public onlyAuthorized returns (uint256) {
        landCount++;

        lands[landCount] = Land({
            propertyId: landCount,
            locationId: _locationId,
            revenueDepartmentId: _revenueDepartmentId,
            surveyNumber: _surveyNumber,
            owner: _owner,
            area: _area,
            price: 0,
            registeredTime: block.timestamp,
            employeeId: address(0),
            scheduledDate: "",
            rejectedReason: "",
            state: StateOfProperty.Created,
            ipfsHash: _ipfsHash,
            landType: _landType
        });

        return landCount;
    }

    function getLandDetailsAsStruct(uint256 _propertyId) public view returns (Land memory) {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");
        return lands[_propertyId];
    }

    function getLandCount() public view returns (uint256) {
        return landCount;
    }

    function removeLand(uint256 _propertyId) public onlyAuthorized {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");
        delete lands[_propertyId];
    }

    function updateLand(
        uint256 _propertyId,
        uint256 _locationId,
        uint256 _revenueDepartmentId,
        uint256 _surveyNumber,
        address _owner,
        uint256 _area,
        address _employeeId,
        string memory _scheduledDate,
        string memory _rejectedReason,
        StateOfProperty _state
    ) public onlyAuthorized {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");

        lands[_propertyId].locationId = _locationId;
        lands[_propertyId].revenueDepartmentId = _revenueDepartmentId;
        lands[_propertyId].surveyNumber = _surveyNumber;
        lands[_propertyId].owner = _owner;
        lands[_propertyId].area = _area;
        lands[_propertyId].employeeId = _employeeId;
        lands[_propertyId].scheduledDate = _scheduledDate;
        lands[_propertyId].rejectedReason = _rejectedReason;
        lands[_propertyId].state = _state;
    }

    // ============ STATE TRANSITIONS ============

    // Land Inspector approves registration: Created -> Verified
    function changeStateToVerifed(uint256 _propertyId, address _employeeId) public onlyAuthorized {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");

        lands[_propertyId].employeeId = _employeeId;
        lands[_propertyId].state = StateOfProperty.Verified;
    }

    // Land Inspector rejects registration: Created -> Rejected
    function changeStateToRejected(
        uint256 _propertyId,
        address _employeeId,
        string memory _reason
    ) public onlyAuthorized {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");

        lands[_propertyId].employeeId = _employeeId;
        lands[_propertyId].state = StateOfProperty.Rejected;
        lands[_propertyId].rejectedReason = _reason;
    }

    // Owner requests to sell: Verified -> SalePending
    function changeStateToSalePending(uint256 _propertyId, uint256 _price, address _owner) public onlyAuthorized {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");
        require(
            lands[_propertyId].state == StateOfProperty.Verified || 
            lands[_propertyId].state == StateOfProperty.Bought,
            "Property must be Verified or Bought before requesting sale"
        );
        require(lands[_propertyId].owner == _owner, "Only owner can request sale");

        lands[_propertyId].state = StateOfProperty.SalePending;
        lands[_propertyId].price = _price;
    }

    // Revenue Employee approves sale: SalePending -> OnSale
    function changeStateFromSalePendingToOnSale(uint256 _propertyId, address _employeeId) public onlyAuthorized {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");
        require(lands[_propertyId].state == StateOfProperty.SalePending, "Property must be in SalePending state");

        lands[_propertyId].employeeId = _employeeId;
        lands[_propertyId].state = StateOfProperty.OnSale;
    }

    // Direct to OnSale (legacy function for backwards compatibility)
    function changeStateToOnSale(uint256 _propertyId, address _owner) public onlyAuthorized {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");
        require(lands[_propertyId].owner == _owner, "Only owner can make available to sell");

        lands[_propertyId].state = StateOfProperty.OnSale;
    }

    // Cancel sale: OnSale/SalePending -> Verified
    function changeStateBackToVerificed(uint256 _propertyId, address _owner) public onlyAuthorized {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");
        require(lands[_propertyId].owner == _owner, "Only owner is allowed");

        lands[_propertyId].state = StateOfProperty.Verified;
        lands[_propertyId].price = 0;
    }

    // Complete sale: -> Bought
    function updateOwner(uint256 _propertyId, address newOwner) public onlyAuthorized {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");

        lands[_propertyId].owner = newOwner;
        lands[_propertyId].state = StateOfProperty.Bought;
    }

    // Set price for sale
    function setPrice(uint256 _propertyId, uint256 _price, address _owner) public onlyAuthorized {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");
        require(lands[_propertyId].owner == _owner, "Only owner");
        
        lands[_propertyId].price = _price;
    }
}

