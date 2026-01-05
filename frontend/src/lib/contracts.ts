import { Address } from "viem";

export const LAND_REGISTRY_ADDRESS = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
export const PROPERTIES_ADDRESS = "0x0000000000000000000000000000000000000000"; // Managed by LandRegistry

// Updated Land struct with landType field
const LandStructComponents = [
  { internalType: "uint256", name: "propertyId", type: "uint256" },
  { internalType: "uint256", name: "locationId", type: "uint256" },
  { internalType: "uint256", name: "revenueDepartmentId", type: "uint256" },
  { internalType: "uint256", name: "surveyNumber", type: "uint256" },
  { internalType: "address", name: "owner", type: "address" },
  { internalType: "uint256", name: "area", type: "uint256" },
  { internalType: "uint256", name: "price", type: "uint256" },
  { internalType: "uint256", name: "registeredTime", type: "uint256" },
  { internalType: "address", name: "employeeId", type: "address" },
  { internalType: "string", name: "scheduledDate", type: "string" },
  { internalType: "string", name: "rejectedReason", type: "string" },
  { internalType: "string", name: "ipfsHash", type: "string" },
  { internalType: "enum Property.StateOfProperty", name: "state", type: "uint8" },
  { internalType: "uint8", name: "landType", type: "uint8" }, // NEW: 0=WithPapers, 1=WithoutPapers
] as const;

export const LAND_REGISTRY_ABI = [
  // ============ LAND REGISTRATION ============
  {
    inputs: [
      { internalType: "uint256", name: "_locationId", type: "uint256" },
      { internalType: "uint256", name: "_revenueDepartmentId", type: "uint256" },
      { internalType: "uint256", name: "_surveyNumber", type: "uint256" },
      { internalType: "uint256", name: "_area", type: "uint256" },
      { internalType: "string", name: "_ipfsHash", type: "string" },
      { internalType: "uint8", name: "_landType", type: "uint8" }, // NEW: 0=WithPapers, 1=WithoutPapers
    ],
    name: "addLand",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // ============ ADMIN FUNCTIONS ============
  {
    inputs: [],
    name: "getContractOwner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "locationId", type: "uint256" },
      { internalType: "address", name: "inspector", type: "address" },
    ],
    name: "assignLandInspector",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "revenueDeptId", type: "uint256" },
      { internalType: "address", name: "employeeAddress", type: "address" },
    ],
    name: "mapRevenueDeptIdToEmployee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // ============ ROLE DETECTION ============
  {
    inputs: [{ internalType: "address", name: "inspector", type: "address" }],
    name: "getInspectorLocation",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "employee", type: "address" }],
    name: "getEmployeeRevenueDept",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "revenueDeptIdToEmployee",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "landInspectorByLocation",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  // ============ LAND INSPECTOR FUNCTIONS ============
  {
    inputs: [{ internalType: "uint256", name: "_propertyId", type: "uint256" }],
    name: "verifyPropertyByInspector",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_propertyId", type: "uint256" },
      { internalType: "string", name: "_reason", type: "string" },
    ],
    name: "rejectPropertyByInspector",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // ============ REVENUE EMPLOYEE FUNCTIONS ============
  {
    inputs: [{ internalType: "uint256", name: "_propertyId", type: "uint256" }],
    name: "approveSaleRequest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_propertyId", type: "uint256" }],
    name: "verifyProperty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_propertyId", type: "uint256" },
      { internalType: "string", name: "_reason", type: "string" },
    ],
    name: "rejectProperty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // ============ VIEW FUNCTIONS ============
  {
    inputs: [{ internalType: "address", name: "_owner", type: "address" }],
    name: "getPropertiesOfOwner",
    outputs: [
      {
        components: LandStructComponents,
        internalType: "struct Property.Land[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_revenueDeptId", type: "uint256" }],
    name: "getPropertiesByRevenueDeptId",
    outputs: [
      {
        components: LandStructComponents,
        internalType: "struct Property.Land[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_locationId", type: "uint256" }],
    name: "getPropertiesByLocation",
    outputs: [
      {
        components: LandStructComponents,
        internalType: "struct Property.Land[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_propertyId", type: "uint256" }],
    name: "getPropertyDetails",
    outputs: [
      {
        components: LandStructComponents,
        internalType: "struct Property.Land",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_propertyId", type: "uint256" },
      { internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const USERS_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
export const TRANSFER_OWNERSHIP_ADDRESS = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";

export const USERS_ABI = [
  {
    inputs: [
      { internalType: "bytes32", name: "_identityHash", type: "bytes32" },
      { internalType: "bytes32", name: "_aadharHash", type: "bytes32" },
    ],
    name: "registerUser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_userId", type: "address" }],
    name: "isUserRegistered",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  // PRE-CHECK: Check if Aadhaar already registered (saves gas on duplicates)
  {
    inputs: [{ internalType: "bytes32", name: "_aadharHash", type: "bytes32" }],
    name: "isAadharRegistered",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_userId", type: "address" }],
    name: "getUserIdentityHash",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_userId", type: "address" },
      { internalType: "string", name: "_firstName", type: "string" },
      { internalType: "string", name: "_lastName", type: "string" },
      { internalType: "string", name: "_dateOfBirth", type: "string" },
      { internalType: "string", name: "_aadhar", type: "string" },
    ],
    name: "verifyIdentity",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_userId", type: "address" }],
    name: "getAccountCreatedTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const TRANSFER_OWNERSHIP_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "_propertyId", type: "uint256" }, { internalType: "uint256", name: "_price", type: "uint256" }],
    name: "addPropertyOnSale",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "locationId", type: "uint256" }],
    name: "getSalesByLocation",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "saleId", type: "uint256" },
          { internalType: "address", name: "owner", type: "address" },
          { internalType: "uint256", name: "price", type: "uint256" },
          { internalType: "uint256", name: "propertyId", type: "uint256" },
          { internalType: "address", name: "acceptedFor", type: "address" },
          { internalType: "enum TransferOwnerShip.SaleState", name: "state", type: "uint8" }
        ],
        internalType: "struct TransferOwnerShip.Sales[]",
        name: "",
        type: "tuple[]",
      }
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_saleId", type: "uint256" }, { internalType: "uint256", name: "_priceOffered", type: "uint256" }],
    name: "sendPurchaseRequest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllSales",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "saleId", type: "uint256" },
          { internalType: "address", name: "owner", type: "address" },
          { internalType: "uint256", name: "price", type: "uint256" },
          { internalType: "uint256", name: "propertyId", type: "uint256" },
          { internalType: "address", name: "acceptedFor", type: "address" },
          { internalType: "uint256", name: "acceptedPrice", type: "uint256" },
          { internalType: "uint256", name: "acceptedTime", type: "uint256" },
          { internalType: "uint256", name: "deadlineForPayment", type: "uint256" },
          { internalType: "bool", name: "paymentDone", type: "bool" },
          { internalType: "enum TransferOwnerShip.SaleState", name: "state", type: "uint8" }
        ],
        internalType: "struct TransferOwnerShip.Sales[]",
        name: "",
        type: "tuple[]",
      }
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_owner", type: "address" }],
    name: "getMySales",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "saleId", type: "uint256" },
          { internalType: "address", name: "owner", type: "address" },
          { internalType: "uint256", name: "price", type: "uint256" },
          { internalType: "uint256", name: "propertyId", type: "uint256" },
          { internalType: "address", name: "acceptedFor", type: "address" },
          { internalType: "enum TransferOwnerShip.SaleState", name: "state", type: "uint8" }
        ],
        internalType: "struct TransferOwnerShip.Sales[]",
        name: "",
        type: "tuple[]",
      }
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_owner", type: "address" }],
    name: "getRequestedSales",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "saleId", type: "uint256" },
          { internalType: "address", name: "owner", type: "address" },
          { internalType: "uint256", name: "price", type: "uint256" },
          { internalType: "uint256", name: "propertyId", type: "uint256" },
          { internalType: "address", name: "acceptedFor", type: "address" },
          { internalType: "uint256", name: "acceptedPrice", type: "uint256" },
          { internalType: "uint256", name: "acceptedTime", type: "uint256" },
          { internalType: "uint256", name: "deadlineForPayment", type: "uint256" },
          { internalType: "bool", name: "paymentDone", type: "bool" },
          { internalType: "enum TransferOwnerShip.SaleState", name: "state", type: "uint8" }
        ],
        internalType: "struct TransferOwnerShip.Sales[]",
        name: "",
        type: "tuple[]",
      }
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "saleId", type: "uint256" }],
    name: "getRequestedUsers",
    outputs: [
      {
        components: [
          { internalType: "address", name: "user", type: "address" },
          { internalType: "uint256", name: "priceOffered", type: "uint256" },
          { internalType: "enum TransferOwnerShip.RequestedUserToASaleState", name: "state", type: "uint8" }
        ],
        internalType: "struct TransferOwnerShip.RequestedUser[]",
        name: "",
        type: "tuple[]",
      }
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_saleId", type: "uint256" }, { internalType: "address", name: "_buyer", type: "address" }, { internalType: "uint256", name: "_price", type: "uint256" }],
    name: "acceptBuyerRequest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "saleId", type: "uint256" }],
    name: "transferOwnerShip",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

