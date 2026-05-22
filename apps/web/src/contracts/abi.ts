export const SELVA_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  { anonymous: false, inputs: [{ indexed: true, name: "lotId", type: "string" }, { indexed: true, name: "from", type: "address" }, { indexed: true, name: "to", type: "address" }], name: "OwnershipTransferred", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "producerAddress", type: "address" }], name: "ProducerCreated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "lotId", type: "string" }, { indexed: true, name: "producer", type: "address" }, { indexed: false, name: "documentHash", type: "bytes32" }], name: "ProductAdded", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "userHash", type: "bytes32" }, { indexed: false, name: "userAddress", type: "address" }], name: "UserRegistered", type: "event" },
  { inputs: [{ name: "_lotId", type: "string" }, { name: "_volume", type: "uint256" }, { name: "_origin", type: "string" }, { name: "_docHash", type: "bytes32" }], name: "addProduct", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_lotId", type: "string" }], name: "deactivateProduct", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_lotId", type: "string" }], name: "getProduct", outputs: [{ name: "lotId", type: "string" }, { name: "volume", type: "uint256" }, { name: "origin", type: "string" }, { name: "producer", type: "address" }, { name: "currentOwner", type: "address" }, { name: "documentHash", type: "bytes32" }, { name: "createdAt", type: "uint256" }, { name: "active", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_lotId", type: "string" }], name: "getProductHistory", outputs: [{ name: "actors", type: "address[]" }, { name: "actions", type: "string[]" }, { name: "docHashes", type: "bytes32[]" }, { name: "froms", type: "address[]" }, { name: "tos", type: "address[]" }, { name: "timestamps", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_userHash", type: "bytes32" }], name: "getUser", outputs: [{ name: "name", type: "string" }, { name: "cpf", type: "string" }, { name: "account", type: "address" }, { name: "createdAt", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "address" }], name: "isProducer", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_addr", type: "address" }], name: "isUserRegistered", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "listAllLotIds", outputs: [{ name: "", type: "string[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "listAllUsers", outputs: [{ name: "", type: "bytes32[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_userAddress", type: "address" }], name: "makeProducer", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "owner", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "_name", type: "string" }, { name: "_cpf", type: "string" }], name: "registerUser", outputs: [{ name: "", type: "bytes32" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_lotId", type: "string" }, { name: "_newOwner", type: "address" }], name: "transferProduct", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "_addr", type: "address" }], name: "userHashOf", outputs: [{ name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
] as const;

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '') as `0x${string}`;
