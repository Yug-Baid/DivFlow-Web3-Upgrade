import { Address } from "viem";

export const LAND_REGISTRY_ADDRESS = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318"; // Updated
export const PROPERTIES_ADDRESS = "0x0000000000000000000000000000000000000000"; // Managed by LandRegistry

// ... (ABI definitions are in between, skipping them for brevity in this replacement block if possible, but replace_file_content works on line ranges. I need to be careful with line numbers.
// The file content has LAND_REGISTRY_ADDRESS at line 3.
// USERS and TRANSFER_OWNERSHIP are at lines 110-111 (in previous view, approx).
// Let's do two separate edits or one if they are close. They are far apart (line 3 vs line 110).
// I will do two REPLACE calls or one MultiReplace. MultiReplace is better.


export const LAND_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "_locationId", type: "uint256" },
      { internalType: "uint256", name: "_revenueDepartmentId", type: "uint256" },
      { internalType: "uint256", name: "_surveyNumber", type: "uint256" },
      { internalType: "uint256", name: "_area", type: "uint256" },
      { internalType: "string", name: "_ipfsHash", type: "string" },
    ],
    name: "addLand",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_owner", type: "address" }],
    name: "getPropertiesOfOwner",
    outputs: [
      {
        components: [
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
        ],
        internalType: "struct Property.Land[]",
        name: "",
        type: "tuple[]",
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
  {
    inputs: [{ internalType: "uint256", name: "_revenueDeptId", type: "uint256" }],
    name: "getPropertiesByRevenueDeptId",
    outputs: [
      {
        components: [
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
        ],
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
    name: "verifyProperty",
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
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "revenueDeptIdToEmployee",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const USERS_ADDRESS = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"; // Updated
export const TRANSFER_OWNERSHIP_ADDRESS = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788"; // Updated

export const USERS_ABI = [
  {
    inputs: [
      { internalType: "string", name: "_fname", type: "string" },
      { internalType: "string", name: "_lname", type: "string" },
      { internalType: "string", name: "_dob", type: "string" },
      { internalType: "string", name: "_aadharNumber", type: "string" },
    ],
    name: "registerUser",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
   {
    inputs: [{ internalType: "address", name: "_addr", type: "address" }],
    name: "getUser",
    outputs: [
      {
        components: [
          { internalType: "string", name: "fname", type: "string" },
          { internalType: "string", name: "lname", type: "string" },
          { internalType: "string", name: "dob", type: "string" },
          { internalType: "string", name: "aadharNumber", type: "string" },
          { internalType: "bool", name: "isUserVerified", type: "bool" }
        ],
        internalType: "struct Users.User",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
   {
    inputs: [{ internalType: "address", name: "_addr", type: "address" }],
    name: "isUserRegistered",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  }
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
    }
] as const;
