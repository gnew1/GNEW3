// Minimal ABI for Delegation contract used by the UI
export default [
  {
    type: "function",
    stateMutability: "view",
    name: "effectiveDelegateOf",
    inputs: [
      { name: "delegator", type: "address" },
      { name: "scope", type: "bytes32" }
    ],
    outputs: [
      { name: "effective", type: "address" },
      { name: "active", type: "bool" },
      { name: "expiresAt", type: "uint64" }
    ]
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "delegate",
    inputs: [
      { name: "scope", type: "bytes32" },
      { name: "delegatee", type: "address" },
      { name: "expiresAt", type: "uint64" }
    ],
    outputs: []
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "extend",
    inputs: [
      { name: "scope", type: "bytes32" },
      { name: "newExpiry", type: "uint64" }
    ],
    outputs: []
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "revoke",
    inputs: [{ name: "scope", type: "bytes32" }],
    outputs: []
  }
] as const;
