// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Users {
    // PRIVACY: User struct stores hashes for verification, profile CID for authorized viewing
    struct User {
        address userID;
        bytes32 identityHash;     // keccak256(firstName + lastName + pan + aadhar)
        bytes32 aadharHash;       // keccak256(aadharNumber) - for uniqueness
        bytes32 panHash;          // keccak256(panNumber) - for uniqueness
        string profileCID;        // IPFS CID for user profile (staff can view)
        uint256 accountCreatedDateTime;
    }

    mapping(address => bool) private registeredUsers;
    mapping(address => User) private users;
    mapping(bytes32 => bool) private aadharHashes;
    mapping(bytes32 => bool) private panHashes;  // NEW: PAN uniqueness

    event UserRegistered(address indexed userID, uint256 indexed accountCreatedDateTime, string profileCID);

    // Register user with hashed identity and IPFS profile
    // Frontend uploads profile to IPFS, then calls this with CID
    function registerUser(
        bytes32 _identityHash,
        bytes32 _aadharHash,
        bytes32 _panHash,
        string memory _profileCID
    ) public {
        require(registeredUsers[msg.sender] == false, "User already registered");
        require(aadharHashes[_aadharHash] == false, "Aadhar number already registered");
        require(panHashes[_panHash] == false, "PAN already registered");

        User memory newUser = User({
            userID: msg.sender,
            identityHash: _identityHash,
            aadharHash: _aadharHash,
            panHash: _panHash,
            profileCID: _profileCID,
            accountCreatedDateTime: block.timestamp
        });

        users[msg.sender] = newUser;
        registeredUsers[msg.sender] = true;
        aadharHashes[_aadharHash] = true;
        panHashes[_panHash] = true;

        emit UserRegistered(msg.sender, block.timestamp, _profileCID);
    }

    // Check if user is registered
    function isUserRegistered(address _userId) public view returns (bool) {
        return registeredUsers[_userId];
    }

    // PRE-CHECK: Check if Aadhaar is already registered
    function isAadharRegistered(bytes32 _aadharHash) public view returns (bool) {
        return aadharHashes[_aadharHash];
    }

    // PRE-CHECK: Check if PAN is already registered
    function isPanRegistered(bytes32 _panHash) public view returns (bool) {
        return panHashes[_panHash];
    }

    // Get user's IPFS profile CID (for staff to view details)
    function getUserProfileCID(address _userId) public view returns (string memory) {
        require(users[_userId].userID != address(0), "User does not exist");
        return users[_userId].profileCID;
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
        string memory _pan,
        string memory _aadhar
    ) public view returns (bool) {
        if (users[_userId].userID == address(0)) return false;
        
        bytes32 computedHash = keccak256(abi.encodePacked(_firstName, _lastName, _pan, _aadhar));
        return users[_userId].identityHash == computedHash;
    }

    // Get account creation time
    function getAccountCreatedTime(address _userId) public view returns (uint256) {
        require(users[_userId].userID != address(0), "User does not exist");
        return users[_userId].accountCreatedDateTime;
    }
}
