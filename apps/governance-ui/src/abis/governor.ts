// Minimal ABI for the Governor used by this UI
export default [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "propose",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "description", type: "string" }
    ],
    outputs: [{ name: "proposalId", type: "uint256" }]
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "castVoteWithReason",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
      { name: "reason", type: "string" }
    ],
    outputs: [{ name: "balance", type: "uint256" }]
  },
  {
    type: "function",
    stateMutability: "view",
    name: "state",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }]
  },
  {
    type: "function",
    stateMutability: "view",
    name: "proposalVotes",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      { name: "againstVotes", type: "uint256" },
      { name: "forVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" }
    ]
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "queue",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "descriptionHash", type: "bytes32" }
    ],
    outputs: [{ name: "proposalId", type: "uint256" }]
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "execute",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "descriptionHash", type: "bytes32" }
    ],
    outputs: [{ name: "proposalId", type: "uint256" }]
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "setQuorumBps",
    inputs: [{ name: "newQuorumBps", type: "uint16" }],
    outputs: []
  },
  {
    type: "event",
    anonymous: false,
    name: "ProposalCreated",
    inputs: [
      { indexed: true, name: "proposalId", type: "uint256" },
      { indexed: true, name: "proposer", type: "address" },
      { indexed: false, name: "targets", type: "address[]" },
      { indexed: false, name: "values", type: "uint256[]" },
      { indexed: false, name: "signatures", type: "string[]" },
      { indexed: false, name: "calldatas", type: "bytes[]" },
      { indexed: false, name: "startBlock", type: "uint256" },
      { indexed: false, name: "endBlock", type: "uint256" },
      { indexed: false, name: "description", type: "string" }
    ]
  }
] as const;
