// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Users {
    // PRIVACY: User struct now stores hashes instead of plaintext PII
    struct User {
        address userID;
        bytes32 identityHash;     // keccak256(firstName + lastName + dob)
        bytes32 aadharHash;       // keccak256(aadharNumber) - for uniqueness
        uint256 accountCreatedDateTime;
    }

    mapping(address => bool) private registeredUsers;
    mapping(address => User) private users;  // Changed to private for privacy
    mapping(bytes32 => bool) private aadharHashes;  // Changed from string to bytes32

    event UserRegistered(address indexed userID, uint256 indexed accountCreatedDateTime);

    // Register user with hashed identity
    // Frontend should call: keccak256(abi.encodePacked(firstName, lastName, dob, aadhar))
    function registerUser(
        bytes32 _identityHash,
        bytes32 _aadharHash
    ) public {
        require(registeredUsers[msg.sender] == false, "User already registered");
        require(aadharHashes[_aadharHash] == false, "Aadhar number already registered");

        User memory newUser = User({
            userID: msg.sender,
            identityHash: _identityHash,
            aadharHash: _aadharHash,
            accountCreatedDateTime: block.timestamp
        });

        users[msg.sender] = newUser;
        registeredUsers[msg.sender] = true;
        aadharHashes[_aadharHash] = true;

        emit UserRegistered(msg.sender, block.timestamp);
    }

    // Check if user is registered
    function isUserRegistered(address _userId) public view returns (bool) {
        return registeredUsers[_userId];
    }

    // PRE-CHECK: Check if Aadhaar is already registered (no gas fee for view function)
    // Frontend should call this BEFORE registerUser to avoid wasting gas
    function isAadharRegistered(bytes32 _aadharHash) public view returns (bool) {
        return aadharHashes[_aadharHash];
    }

    // Get user's identity hash (for verification purposes)
    function getUserIdentityHash(address _userId) public view returns (bytes32) {
        require(users[_userId].userID != address(0), "User does not exist");
        return users[_userId].identityHash;
    }

    // Verify identity: user provides raw data, we hash and compare
    function verifyIdentity(
        address _userId,
        string memory _firstName,
        string memory _lastName,
        string memory _dateOfBirth,
        string memory _aadhar
    ) public view returns (bool) {
        if (users[_userId].userID == address(0)) return false;
        
        bytes32 computedHash = keccak256(abi.encodePacked(_firstName, _lastName, _dateOfBirth, _aadhar));
        return users[_userId].identityHash == computedHash;
    }

    // Get account creation time
    function getAccountCreatedTime(address _userId) public view returns (uint256) {
        require(users[_userId].userID != address(0), "User does not exist");
        return users[_userId].accountCreatedDateTime;
    }
}
