
/**
 * SDK para interactuar con el contrato FairOrdering.
 * Permite generar commits y revelar transacciones protegidas contra MEV.
 */
import { ethers } from "ethers";
import FairOrdering from "../../artifacts/contracts/mev/FairOrdering.sol/FairOrdering.json";

export class MevGuardSDK {
  private readonly contract: ethers.Contract;

  constructor(address: string, provider: ethers.JsonRpcProvider, signer?: ethers.Signer) {
    this.contract = new ethers.Contract(address, FairOrdering.abi, signer || provider);
  }

  async commit(txData: string, salt: string) {
    const commitHash = ethers.keccak256(ethers.solidityPacked(["bytes", "bytes32"], [txData, salt]));
    const tx = await this.contract.commit(commitHash);
    return tx.wait();
  }

  async reveal(txData: string, salt: string) {
    const tx = await this.contract.reveal(txData, salt);
    return tx.wait();
  }

  async getCommitment(account: string) {
    return await this.contract.commitments(account);
  }
}


