// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Property {
    // Created   : Represents, inintal state, when property details are added by user
    // Scheduled : Represents, when correponding surveyer scheduled for verification
    // Rejected  : Represents, property is rejected by surveyer
    // Verified  : Represents, property is verified.
    enum StateOfProperty {
        Created,
        Scheduled,
        Verified,
        Rejected,
        OnSale,
        Bought
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
        address employeeId;
        string scheduledDate;
        string rejectedReason;
        string ipfsHash;
        StateOfProperty state;
    }

    // property Id ==> property
    mapping(uint256 => Land) public lands;

    // used to generate property id
    uint256 private landCount;

    function addLand(
        uint256 _locationId,
        uint256 _revenueDepartmentId,
        uint256 _surveyNumber,
        address _owner,
        uint256 _area,
        string memory _ipfsHash
    ) public returns (uint256) {
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
            ipfsHash: _ipfsHash
        });
        // return propertyId
        return landCount;
    }

    function getLandDetailsAsStruct(uint256 _propertyId) public view returns (Land memory) {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");

        return lands[_propertyId];
    }

    function removeLand(uint256 _propertyId) public {
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
    ) public {
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

    function changeStateToVerifed(uint256 _propertyId, address _employeeId) public {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");

        lands[_propertyId].employeeId = _employeeId;
        lands[_propertyId].state = StateOfProperty.Verified;
    }

    function changeStateToRejected(
        uint256 _propertyId,
        address _employeeId,
        string memory _reason
    ) public {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");

        lands[_propertyId].employeeId = _employeeId;
        lands[_propertyId].state = StateOfProperty.Rejected;
        lands[_propertyId].rejectedReason = _reason;
    }

    function changeStateToOnSale(uint256 _propertyId, address _owner) public {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");
        require(lands[_propertyId].owner == _owner, "only owner can make available to sell");

        lands[_propertyId].state = StateOfProperty.OnSale;
    }

    // function to change state from on sale to verified
    // when sale is canceled from active state
    function changeStateBackToVerificed(uint256 _propertyId, address _owner) public {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");
        require(lands[_propertyId].owner == _owner, "only owner his allowed");

        lands[_propertyId].state = StateOfProperty.Verified;
    }

    function updateOwner(uint256 _propertyId, address newOwner) public {
        require(lands[_propertyId].propertyId != 0, "Land does not exist");

        // changing new owner
        lands[_propertyId].owner = newOwner;

        // changing state back to verified
        // after successful ownership transfer
        lands[_propertyId].state = StateOfProperty.Bought;
    }
}
