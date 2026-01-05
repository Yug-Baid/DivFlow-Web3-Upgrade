// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Properties.sol";

contract LandRegistry {
    address private contractOwner;
    address private transferOwnershipContractAddress;
    bool private transferOwnershipContractAddressUpdated = false;

    Property public propertiesContract;

    constructor() {
        contractOwner = msg.sender;
        transferOwnershipContractAddress = address(0);
        transferOwnershipContractAddressUpdated = false;
        propertiesContract = new Property();
    }

    // ============ MODIFIERS ============

    modifier onlyOwner() {
        require(msg.sender == contractOwner, "Caller is not the owner");
        _;
    }

    modifier onlyLandInspector(uint256 locationId) {
        require(
            msg.sender == landInspectorByLocation[locationId],
            "Only assigned Land Inspector can call this function."
        );
        _;
    }

    modifier onlyRevenueDeptEmployee(uint256 revenueDeptId) {
        require(
            msg.sender == revenueDeptIdToEmployee[revenueDeptId],
            "Only the revenue department employee can call this function."
        );
        _;
    }

    // ============ EVENTS ============
    
    event LandAdded(address indexed owner, uint256 indexed propertyId);
    event LandInspectorAssigned(uint256 indexed locationId, address indexed inspector);
    event RevenuEmployeeAssigned(uint256 indexed deptId, address indexed employee);
    event PropertyVerifiedByInspector(uint256 indexed propertyId, address indexed inspector);
    event PropertyRejectedByInspector(uint256 indexed propertyId, address indexed inspector, string reason);
    event SaleRequestApproved(uint256 indexed propertyId, address indexed employee);

    // ============ MAPPINGS ============

    // Owner's properties
    mapping(address => uint256[]) private propertiesOfOwner;

    // Revenue Department's properties
    mapping(uint256 => uint256[]) private propertiesControlledByRevenueDept;

    // Revenue department ID => employee address
    mapping(uint256 => address) public revenueDeptIdToEmployee;
    
    // Reverse mapping: employee address => revenue dept ID (for frontend role detection)
    mapping(address => uint256) public employeeToRevenueDeptId;

    // Land Inspector: location ID => inspector address
    mapping(uint256 => address) public landInspectorByLocation;
    
    // Reverse mapping: inspector address => location ID (for frontend role detection)
    mapping(address => uint256) public inspectorToLocationId;

    // SECURITY: Prevent duplicate properties
    mapping(bytes32 => bool) private registeredProperties;
    
    // SECURITY: Prevent duplicate IPFS documents
    mapping(string => bool) private registeredDocuments;

    // ============ ADMIN FUNCTIONS ============

    function getContractOwner() public view returns (address) {
        return contractOwner;
    }

    function setTransferOwnershipContractAddress(address contractAddress) public {
        require(transferOwnershipContractAddressUpdated == false, "Allowed Only Once to call");
        transferOwnershipContractAddress = contractAddress;
        propertiesContract.setTransferOwnershipAddress(contractAddress);
        transferOwnershipContractAddressUpdated = true;
    }

    // Assign Land Inspector to a location/region
    function assignLandInspector(uint256 locationId, address inspector) public onlyOwner {
        // BUG-12 FIX: Prevent duplicate assignment - same wallet cannot be inspector for multiple locations
        require(
            inspectorToLocationId[inspector] == 0 || inspectorToLocationId[inspector] == locationId,
            "Inspector already assigned to another location"
        );
        
        // Remove old inspector's reverse mapping if exists
        address oldInspector = landInspectorByLocation[locationId];
        if (oldInspector != address(0)) {
            inspectorToLocationId[oldInspector] = 0;
        }
        
        landInspectorByLocation[locationId] = inspector;
        inspectorToLocationId[inspector] = locationId;
        
        emit LandInspectorAssigned(locationId, inspector);
    }

    // Assign Revenue Employee to a department
    function mapRevenueDeptIdToEmployee(uint256 revenueDeptId, address employeeAddress) public onlyOwner {
        // BUG-12 FIX: Prevent duplicate assignment - same wallet cannot be employee for multiple departments
        require(
            employeeToRevenueDeptId[employeeAddress] == 0 || employeeToRevenueDeptId[employeeAddress] == revenueDeptId,
            "Employee already assigned to another department"
        );
        
        // Remove old employee's reverse mapping if exists
        address oldEmployee = revenueDeptIdToEmployee[revenueDeptId];
        if (oldEmployee != address(0)) {
            employeeToRevenueDeptId[oldEmployee] = 0;
        }
        
        revenueDeptIdToEmployee[revenueDeptId] = employeeAddress;
        employeeToRevenueDeptId[employeeAddress] = revenueDeptId;
        
        emit RevenuEmployeeAssigned(revenueDeptId, employeeAddress);
    }

    // Get inspector's assigned location (for frontend role detection)
    function getInspectorLocation(address inspector) public view returns (uint256) {
        return inspectorToLocationId[inspector];
    }

    // Get employee's assigned department (for frontend role detection)
    function getEmployeeRevenueDept(address employee) public view returns (uint256) {
        return employeeToRevenueDeptId[employee];
    }

    // ============ LAND REGISTRATION ============

    function addLand(
        uint256 _locationId,
        uint256 _revenueDepartmentId,
        uint256 _surveyNumber,
        uint256 _area,
        string memory _ipfsHash,
        uint8 _landType  // 0 = WithPapers, 1 = WithoutPapers
    ) public returns (uint256) {
        // SECURITY: Check for duplicate property
        bytes32 propertyKey = keccak256(abi.encodePacked(_locationId, _revenueDepartmentId, _surveyNumber));
        require(!registeredProperties[propertyKey], "Property already registered with these identifiers");
        
        // SECURITY: Check for duplicate IPFS document
        require(!registeredDocuments[_ipfsHash], "This document (IPFS hash) is already registered to another property");
        
        // Mark as registered
        registeredProperties[propertyKey] = true;
        registeredDocuments[_ipfsHash] = true;

        address _owner = msg.sender;
        uint256 propertyId = propertiesContract.addLand(
            _locationId,
            _revenueDepartmentId,
            _surveyNumber,
            _owner,
            _area,
            _ipfsHash,
            _landType
        );

        propertiesOfOwner[_owner].push(propertyId);
        propertiesControlledByRevenueDept[_revenueDepartmentId].push(propertyId);

        emit LandAdded(_owner, propertyId);

        return propertyId;
    }

    // ============ LAND INSPECTOR FUNCTIONS ============

    function getLocationId(uint256 propertyId) private view returns (uint256) {
        return propertiesContract.getLandDetailsAsStruct(propertyId).locationId;
    }

    function getRevenueDeptId(uint256 propertyId) private view returns (uint256) {
        return propertiesContract.getLandDetailsAsStruct(propertyId).revenueDepartmentId;
    }

    // Land Inspector approves property registration
    function verifyPropertyByInspector(uint256 _propertyId)
        public
        onlyLandInspector(getLocationId(_propertyId))
    {
        propertiesContract.changeStateToVerifed(_propertyId, msg.sender);
        emit PropertyVerifiedByInspector(_propertyId, msg.sender);
    }

    // Land Inspector rejects property registration
    function rejectPropertyByInspector(uint256 _propertyId, string memory _reason)
        public
        onlyLandInspector(getLocationId(_propertyId))
    {
        propertiesContract.changeStateToRejected(_propertyId, msg.sender, _reason);
        emit PropertyRejectedByInspector(_propertyId, msg.sender, _reason);
    }

    // ============ REVENUE EMPLOYEE FUNCTIONS ============

    // Revenue Employee approves sale request (changes SalePending -> OnSale)
    function approveSaleRequest(uint256 _propertyId)
        public
        onlyRevenueDeptEmployee(getRevenueDeptId(_propertyId))
    {
        propertiesContract.changeStateFromSalePendingToOnSale(_propertyId, msg.sender);
        emit SaleRequestApproved(_propertyId, msg.sender);
    }

    // Legacy function name for backwards compatibility
    function verifyProperty(uint256 _propertyId)
        public
        onlyRevenueDeptEmployee(getRevenueDeptId(_propertyId))
    {
        propertiesContract.changeStateToVerifed(_propertyId, msg.sender);
    }

    function rejectProperty(uint256 _propertyId, string memory _reason)
        public
        onlyRevenueDeptEmployee(getRevenueDeptId(_propertyId))
    {
        propertiesContract.changeStateToRejected(_propertyId, msg.sender, _reason);
    }

    // ============ VIEW FUNCTIONS ============

    function getPropertyDetails(uint256 _propertyId)
        public
        view
        returns (Property.Land memory)
    {
        return propertiesContract.getLandDetailsAsStruct(_propertyId);
    }

    function getPropertiesOfOwner(address _owner)
        public
        view
        returns (Property.Land[] memory)
    {
        uint256[] memory propertyIds = propertiesOfOwner[_owner];
        Property.Land[] memory properties = new Property.Land[](propertyIds.length);

        for (uint256 i = 0; i < propertyIds.length; i++) {
            properties[i] = propertiesContract.getLandDetailsAsStruct(propertyIds[i]);
        }

        return properties;
    }

    function getPropertiesByRevenueDeptId(uint256 _revenueDeptId)
        public
        view
        returns (Property.Land[] memory)
    {
        uint256[] memory propertyIds = propertiesControlledByRevenueDept[_revenueDeptId];
        Property.Land[] memory properties = new Property.Land[](propertyIds.length);

        for (uint256 i = 0; i < propertyIds.length; i++) {
            properties[i] = propertiesContract.getLandDetailsAsStruct(propertyIds[i]);
        }

        return properties;
    }

    // Get properties by location (for Land Inspector)
    function getPropertiesByLocation(uint256 _locationId)
        public
        view
        returns (Property.Land[] memory)
    {
        // Note: This is inefficient for large datasets but works for hackathon demo
        // In production, use events/subgraph for indexing
        uint256 count = 0;
        uint256 totalProperties = propertiesContract.getLandCount();
        
        // First pass: count matching properties
        for (uint256 i = 1; i <= totalProperties; i++) {
            if (propertiesContract.getLandDetailsAsStruct(i).locationId == _locationId) {
                count++;
            }
        }
        
        // Second pass: collect matching properties
        Property.Land[] memory properties = new Property.Land[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= totalProperties; i++) {
            Property.Land memory land = propertiesContract.getLandDetailsAsStruct(i);
            if (land.locationId == _locationId) {
                properties[index] = land;
                index++;
            }
        }
        
        return properties;
    }

    // ============ OWNERSHIP TRANSFER ============

    function transferOwnership(uint256 _propertyId, address newOwner) public {
        require(
            msg.sender == transferOwnershipContractAddress,
            "Only TransferOfOwnerShip Contract Allowed"
        );

        address oldOwner = propertiesContract.getLandDetailsAsStruct(_propertyId).owner;

        uint256[] storage propertiesOfOldOwner = propertiesOfOwner[oldOwner];
        for (uint256 i = 0; i < propertiesOfOldOwner.length; i++) {
            if (propertiesOfOldOwner[i] == _propertyId) {
                propertiesOfOldOwner[i] = propertiesOfOldOwner[propertiesOfOldOwner.length - 1];
                propertiesOfOldOwner.pop();
                break;
            }
        }

        propertiesOfOwner[newOwner].push(_propertyId);
        propertiesContract.updateOwner(_propertyId, newOwner);
    }

    function getPropertiesContract() public view returns (address) {
        return address(propertiesContract);
    }
}

