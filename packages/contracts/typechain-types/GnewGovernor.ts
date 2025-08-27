import { Contract, Interface, type ContractRunner, type AddressLike, type BigNumberish, type BytesLike, type ContractTransactionResponse } from "ethers";

export interface GnewGovernor extends Contract {
  propose(targets: AddressLike[], values: BigNumberish[], calldatas: BytesLike[], description: string): Promise<ContractTransactionResponse>;
  castVote(proposalId: BigNumberish, support: BigNumberish): Promise<ContractTransactionResponse>;
  queue(targets: AddressLike[], values: BigNumberish[], calldatas: BytesLike[], descriptionHash: BytesLike): Promise<ContractTransactionResponse>;
  execute(targets: AddressLike[], values: BigNumberish[], calldatas: BytesLike[], descriptionHash: BytesLike): Promise<ContractTransactionResponse>;
  proposalSnapshot(proposalId: BigNumberish): Promise<bigint>;
  proposalVotes(proposalId: BigNumberish): Promise<{ againstVotes: bigint; forVotes: bigint; abstainVotes: bigint }>;
}

export class GnewGovernor__factory {
  static readonly abi = [
    "event ProposalCreated(uint256 proposalId,address proposer,address[] targets,uint256[] values,string[] signatures,bytes[] calldatas,uint256 startBlock,uint256 endBlock,string description)",
    "function propose(address[] targets,uint256[] values,bytes[] calldatas,string description) returns (uint256)",
    "function castVote(uint256 proposalId,uint8 support)",
    "function queue(address[] targets,uint256[] values,bytes[] calldatas,bytes32 descriptionHash)",
    "function execute(address[] targets,uint256[] values,bytes[] calldatas,bytes32 descriptionHash)",
    "function proposalSnapshot(uint256 proposalId) view returns (uint256)",
    "function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes,uint256 forVotes,uint256 abstainVotes)"
  ];

  static createInterface(): Interface {
    return new Interface(this.abi);
  }

  static connect(address: string, runner?: ContractRunner | null): GnewGovernor {
    return new Contract(address, this.abi, runner) as unknown as GnewGovernor;
  }
}
