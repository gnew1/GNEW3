import { Contract, Interface, type ContractRunner, type AddressLike, type BigNumberish, type ContractTransactionResponse } from "ethers";

export interface GnewGovToken extends Contract {
  delegate(delegatee: AddressLike): Promise<ContractTransactionResponse>;
  getPastTotalSupply(blockNumber: BigNumberish): Promise<bigint>;
}

export class GnewGovToken__factory {
  static readonly abi = [
    "function delegate(address delegatee)",
    "function getPastTotalSupply(uint256 blockNumber) view returns (uint256)"
  ];

  static createInterface(): Interface {
    return new Interface(this.abi);
  }

  static connect(address: string, runner?: ContractRunner | null): GnewGovToken {
    return new Contract(address, this.abi, runner) as unknown as GnewGovToken;
  }
}
